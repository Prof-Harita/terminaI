/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand, CommandContext } from './types.js';
import { CommandKind } from './types.js';
import {
  listSessionLogs,
  readSessionLog,
  countEventTypes,
  generateMarkdownReport,
  saveEvaluationReport,
  type SessionEvaluation,
  type EvaluationScore,
} from '@terminai/core';
import { MessageType } from '../types.js';

export const evaluateCommand: SlashCommand = {
  name: 'evaluate',
  kind: CommandKind.BUILT_IN,
  description: 'Evaluate recent sessions and generate an insights report',
  hidden: true,
  action: async (context: CommandContext, args: string) => {
    const { config, logger } = context.services;
    const { addItem } = context.ui;

    if (!config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      };
    }

    addItem(
      { type: MessageType.INFO, text: '📊 Starting session evaluation...' },
      Date.now(),
    );

    // Get all session logs
    const sessionIds = await listSessionLogs();

    if (sessionIds.length === 0) {
      return {
        type: 'message',
        messageType: 'info',
        content: 'No session logs found in ~/.terminai/logs/',
      };
    }

    // Parse limit from args (default: 5)
    const limit = parseInt(args.trim() || '5', 10);
    const sessionsToEvaluate = sessionIds.slice(0, limit);

    addItem(
      {
        type: MessageType.INFO,
        text: `Found ${sessionIds.length} sessions. Evaluating ${sessionsToEvaluate.length}...`,
      },
      Date.now(),
    );

    const evaluations: SessionEvaluation[] = [];

    for (const sessionId of sessionsToEvaluate) {
      const events = await readSessionLog(sessionId);

      if (events.length === 0) {
        continue;
      }

      // Count event types for basic stats
      const eventCounts = countEventTypes(events);

      // For now, use heuristic-based scoring instead of LLM
      // (LLM evaluation can be added later once ContentGenerator is accessible)
      const scores: EvaluationScore = {
        taskSuccess: events.some((e) => e.eventType === 'tool_result') ? 7 : 5,
        toolEfficiency: Math.min(
          10,
          Math.max(1, 10 - (eventCounts['tool_call'] || 0) / 2),
        ),
        reasoningQuality: events.some((e) => e.eventType === 'thought') ? 8 : 5,
        errorRecovery: events.some((e) => e.eventType === 'error') ? 6 : 8,
        userFriction: Math.min(
          10,
          Math.max(1, 10 - (eventCounts['approval'] || 0)),
        ),
        overall: 0,
      };

      scores.overall = Math.round(
        (scores.taskSuccess +
          scores.toolEfficiency +
          scores.reasoningQuality +
          scores.errorRecovery +
          scores.userFriction) /
          5,
      );

      evaluations.push({
        sessionId,
        timestamp: new Date().toISOString(),
        scores,
        summary: `Session with ${events.length} events.`,
        highlights: [`Processed ${eventCounts['tool_call'] || 0} tool calls.`],
        improvements:
          scores.overall < 7 ? ['Consider reducing tool call frequency.'] : [],
        eventCounts,
      });
    }

    if (evaluations.length === 0) {
      return {
        type: 'message',
        messageType: 'info',
        content: 'Could not evaluate any sessions. They may be empty.',
      };
    }

    // Generate and save report
    const report = generateMarkdownReport(evaluations);
    const reportPath = await saveEvaluationReport(report);

    // Log the evaluation event
    await logger?.logEventFull('evaluation', {
      sessionsEvaluated: evaluations.length,
      averageScore:
        evaluations.reduce((sum, e) => sum + e.scores.overall, 0) /
        evaluations.length,
    });

    return {
      type: 'message',
      messageType: 'info',
      content: `✅ Evaluated ${evaluations.length} sessions.\n📄 Report saved to: ${reportPath}`,
    };
  },
};
