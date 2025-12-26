/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Storage } from '../config/storage.js';
import type { TerminaILogEvent, EventType } from '../core/logger.js';

export interface EvaluationScore {
  taskSuccess: number; // 0-10
  toolEfficiency: number; // 0-10
  reasoningQuality: number; // 0-10
  errorRecovery: number; // 0-10
  userFriction: number; // 0-10
  overall: number; // 0-10
}

export interface SessionEvaluation {
  sessionId: string;
  timestamp: string;
  scores: EvaluationScore;
  summary: string;
  highlights: string[];
  improvements: string[];
  eventCounts: Record<EventType, number>;
}

export interface DailyRetrospective {
  date: string;
  sessionsEvaluated: number;
  averageScores: EvaluationScore;
  topIssues: string[];
  recommendations: string[];
}

/**
 * Reads all events from a session log file.
 */
export async function readSessionLog(
  sessionId: string,
): Promise<TerminaILogEvent[]> {
  const logsDir = Storage.getGlobalLogsDir();
  const logPath = path.join(logsDir, `${sessionId}.jsonl`);

  try {
    const content = await fs.readFile(logPath, 'utf-8');
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
    return lines.map((line) => JSON.parse(line) as TerminaILogEvent);
  } catch {
    return [];
  }
}

/**
 * Lists all available session IDs from log files.
 */
export async function listSessionLogs(): Promise<string[]> {
  const logsDir = Storage.getGlobalLogsDir();

  try {
    const entries = await fs.readdir(logsDir);
    return entries
      .filter((entry) => entry.endsWith('.jsonl'))
      .map((entry) => entry.replace('.jsonl', ''));
  } catch {
    return [];
  }
}

/**
 * Counts events by type in a session.
 */
export function countEventTypes(
  events: TerminaILogEvent[],
): Record<EventType, number> {
  const counts: Record<EventType, number> = {
    user_prompt: 0,
    model_response: 0,
    thought: 0,
    tool_call: 0,
    tool_result: 0,
    approval: 0,
    error: 0,
    session_start: 0,
    session_end: 0,
    evaluation: 0,
  };
  for (const event of events) {
    counts[event.eventType] = (counts[event.eventType] || 0) + 1;
  }
  return counts;
}

/**
 * Generates an evaluation prompt for the LLM.
 */
export function generateEvaluationPrompt(events: TerminaILogEvent[]): string {
  const eventSummary = events.map((e) => ({
    type: e.eventType,
    timestamp: e.timestamp,
    payload: e.payload,
  }));

  return `You are evaluating a TerminaI CLI session. Analyze the following session log and provide scores and feedback.

## Session Log (JSON)
\`\`\`json
${JSON.stringify(eventSummary, null, 2)}
\`\`\`

## Evaluation Criteria

Score each dimension from 0-10:

1. **Task Success**: Did the agent complete the user's stated goal?
2. **Tool Efficiency**: Were tool calls necessary, or was there wasted effort?
3. **Reasoning Quality**: Was the framework selection appropriate?
4. **Error Recovery**: When failures occurred, did the agent recover gracefully?
5. **User Friction**: How many approvals were needed? Were any unnecessary?

## Response Format (JSON)

Respond ONLY with valid JSON matching this schema:

\`\`\`json
{
  "scores": {
    "taskSuccess": <0-10>,
    "toolEfficiency": <0-10>,
    "reasoningQuality": <0-10>,
    "errorRecovery": <0-10>,
    "userFriction": <0-10>
  },
  "summary": "<one paragraph summary>",
  "highlights": ["<positive observation 1>", "<positive observation 2>"],
  "improvements": ["<suggestion 1>", "<suggestion 2>"]
}
\`\`\``;
}

/**
 * Parses the LLM's evaluation response.
 */
export function parseEvaluationResponse(
  response: string,
): Partial<SessionEvaluation> | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch =
      response.match(/```json\s*([\s\S]*?)\s*```/) ||
      response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return null;

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    const scores: EvaluationScore = {
      taskSuccess: parsed.scores?.taskSuccess ?? 5,
      toolEfficiency: parsed.scores?.toolEfficiency ?? 5,
      reasoningQuality: parsed.scores?.reasoningQuality ?? 5,
      errorRecovery: parsed.scores?.errorRecovery ?? 5,
      userFriction: parsed.scores?.userFriction ?? 5,
      overall: 0,
    };

    // Calculate overall score as average
    scores.overall = Math.round(
      (scores.taskSuccess +
        scores.toolEfficiency +
        scores.reasoningQuality +
        scores.errorRecovery +
        scores.userFriction) /
        5,
    );

    return {
      scores,
      summary: parsed.summary || 'No summary provided.',
      highlights: parsed.highlights || [],
      improvements: parsed.improvements || [],
    };
  } catch {
    return null;
  }
}

/**
 * Generates a markdown report from evaluations.
 */
export function generateMarkdownReport(
  evaluations: SessionEvaluation[],
): string {
  if (evaluations.length === 0) {
    return '# Session Evaluation Report\n\nNo sessions to evaluate.';
  }

  const avgScores = {
    taskSuccess: 0,
    toolEfficiency: 0,
    reasoningQuality: 0,
    errorRecovery: 0,
    userFriction: 0,
    overall: 0,
  };

  for (const evaluation of evaluations) {
    avgScores.taskSuccess += evaluation.scores.taskSuccess;
    avgScores.toolEfficiency += evaluation.scores.toolEfficiency;
    avgScores.reasoningQuality += evaluation.scores.reasoningQuality;
    avgScores.errorRecovery += evaluation.scores.errorRecovery;
    avgScores.userFriction += evaluation.scores.userFriction;
    avgScores.overall += evaluation.scores.overall;
  }

  const count = evaluations.length;
  for (const key of Object.keys(avgScores) as Array<keyof typeof avgScores>) {
    avgScores[key] = Math.round((avgScores[key] / count) * 10) / 10;
  }

  let report = `# Session Evaluation Report

**Generated**: ${new Date().toISOString()}
**Sessions Evaluated**: ${count}

## Average Scores

| Dimension | Score |
|-----------|-------|
| Task Success | ${avgScores.taskSuccess}/10 |
| Tool Efficiency | ${avgScores.toolEfficiency}/10 |
| Reasoning Quality | ${avgScores.reasoningQuality}/10 |
| Error Recovery | ${avgScores.errorRecovery}/10 |
| User Friction | ${avgScores.userFriction}/10 |
| **Overall** | **${avgScores.overall}/10** |

## Session Details

`;

  for (const evaluation of evaluations) {
    report += `### Session: ${evaluation.sessionId}

**Score**: ${evaluation.scores.overall}/10

${evaluation.summary}

`;
    if (evaluation.highlights.length > 0) {
      report += `**Highlights**:\n${evaluation.highlights.map((h) => `- ${h}`).join('\n')}\n\n`;
    }
    if (evaluation.improvements.length > 0) {
      report += `**Improvements**:\n${evaluation.improvements.map((i) => `- ${i}`).join('\n')}\n\n`;
    }
    report += '---\n\n';
  }

  return report;
}

/**
 * Saves an evaluation report to disk.
 */
export async function saveEvaluationReport(report: string): Promise<string> {
  const evaluationsDir = path.join(Storage.getGlobalGeminiDir(), 'evaluations');
  await fs.mkdir(evaluationsDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const reportPath = path.join(evaluationsDir, `${date}.md`);

  await fs.writeFile(reportPath, report, 'utf-8');
  return reportPath;
}
