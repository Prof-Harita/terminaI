/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { TaskResult, FailureCluster } from './types.js';
import { readSessionLog, type TerminaILogEvent } from '@terminai/core';

/**
 * Aggregator - Clusters failures and generates trend reports.
 */
export class Aggregator {
  private results: TaskResult[] = [];
  private sessions: Map<string, TerminaILogEvent[]> = new Map();

  /**
   * Adds results to the aggregator.
   */
  async addResults(results: TaskResult[]): Promise<void> {
    this.results.push(...results);

    // Load session logs for each result
    for (const result of results) {
      if (result.sessionId) {
        const events = await readSessionLog(result.sessionId);
        if (events.length > 0) {
          this.sessions.set(result.sessionId, events);
        }
      }
    }
  }

  /**
   * Clusters failures by error type.
   */
  clusterFailures(): FailureCluster[] {
    const failedResults = this.results.filter((r) => !r.success);
    const clusters = new Map<string, TaskResult[]>();

    for (const result of failedResults) {
      const errorType = this.classifyError(result);
      const existing = clusters.get(errorType) || [];
      existing.push(result);
      clusters.set(errorType, existing);
    }

    return Array.from(clusters.entries()).map(([errorType, results]) => ({
      clusterId: randomUUID(),
      errorType,
      component: this.identifyComponent(results),
      affectedSessions: results.length,
      representativeTaskIds: results.slice(0, 5).map((r) => r.taskId),
      hypothesis: this.generateHypothesis(errorType, results),
      suggestedFix: this.suggestFix(errorType),
    }));
  }

  /**
   * Classifies an error based on result content.
   */
  private classifyError(result: TaskResult): string {
    const stderr = result.stderr.toLowerCase();

    if (stderr.includes('timeout')) return 'timeout';
    if (stderr.includes('permission denied')) return 'permission_denied';
    if (stderr.includes('not found')) return 'command_not_found';
    if (stderr.includes('network') || stderr.includes('connection'))
      return 'network_error';
    if (stderr.includes('quota') || stderr.includes('limit'))
      return 'quota_exceeded';
    if (result.exitCode === 1) return 'general_failure';
    return 'unknown';
  }

  /**
   * Identifies the component that failed.
   */
  private identifyComponent(results: TaskResult[]): string {
    // Check session logs for tool calls that failed
    for (const result of results) {
      const events = this.sessions.get(result.sessionId);
      if (events) {
        const toolCalls = events.filter((e) => e.eventType === 'tool_call');
        if (toolCalls.length > 0) {
          const lastTool = toolCalls[toolCalls.length - 1];
          return (lastTool?.payload?.['toolName'] as string) || 'unknown';
        }
      }
    }

    // Infer from stderr
    const stderr = results[0]?.stderr.toLowerCase() || '';
    if (stderr.includes('shell')) return 'shell';
    if (stderr.includes('edit')) return 'edit_file';
    if (stderr.includes('read')) return 'read_file';
    return 'unknown';
  }

  /**
   * Generates a hypothesis for the failure.
   */
  private generateHypothesis(
    errorType: string,
    _results: TaskResult[],
  ): string {
    const hypotheses: Record<string, string> = {
      timeout:
        'Tasks are taking longer than expected, possibly due to slow I/O or network operations',
      permission_denied:
        'Sandbox lacks necessary permissions for the requested operations',
      command_not_found:
        'Required tools are not installed in the sandbox environment',
      network_error:
        'Network connectivity issues or firewall restrictions in sandbox',
      quota_exceeded: 'LLM API quota limits reached during execution',
      general_failure:
        'Generic failure, needs manual inspection of representative cases',
      unknown: 'Error pattern not recognized, requires manual analysis',
    };

    return hypotheses[errorType] || hypotheses['unknown'];
  }

  /**
   * Suggests a fix for the error type.
   */
  private suggestFix(errorType: string): string {
    const fixes: Record<string, string> = {
      timeout: 'Increase task timeout or optimize slow operations',
      permission_denied:
        'Review sandbox permissions and add required capabilities',
      command_not_found: 'Install missing tools in sandbox Dockerfile',
      network_error: 'Check sandbox network configuration and firewall rules',
      quota_exceeded: 'Implement rate limiting or increase API quota',
      general_failure: 'Inspect specific failure cases and add error handling',
      unknown: 'Conduct root cause analysis on representative sessions',
    };

    return fixes[errorType] || fixes['unknown'];
  }

  /**
   * Generates a markdown trend report.
   */
  generateReport(): string {
    const total = this.results.length;
    const successful = this.results.filter((r) => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;

    const clusters = this.clusterFailures();

    let report = `# Evolution Lab Trend Report

**Generated**: ${new Date().toISOString()}
**Total Tasks**: ${total}
**Success Rate**: ${successRate}% (${successful}/${total})

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | ${total} |
| Successful | ${successful} |
| Failed | ${failed} |
| Success Rate | ${successRate}% |

## Failure Clusters

`;

    if (clusters.length === 0) {
      report += 'No failures detected. All tasks completed successfully.\n';
    } else {
      for (const cluster of clusters) {
        report += `### ${cluster.errorType} (${cluster.affectedSessions} sessions)

**Component**: ${cluster.component}

**Hypothesis**: ${cluster.hypothesis}

**Suggested Fix**: ${cluster.suggestedFix}

---

`;
      }
    }

    return report;
  }

  /**
   * Saves report to disk.
   */
  async saveReport(outputPath: string): Promise<void> {
    const report = this.generateReport();
    await fs.writeFile(outputPath, report, 'utf-8');
  }

  /**
   * Clears all aggregated data.
   */
  clear(): void {
    this.results = [];
    this.sessions.clear();
  }
}
