/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RiskAssessment, RiskDimensions } from './riskAssessor.js';

export type ExecutionStrategy =
  | { type: 'fast-path' }
  | { type: 'preview'; preview: string }
  | { type: 'iterate'; maxRetries: number }
  | { type: 'plan-snapshot'; plan: string; snapshotId?: string };

export interface ExecutionDecision {
  strategy: ExecutionStrategy;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  shouldWarn: boolean;
  warningMessage?: string;
}

export function routeExecution(assessment: RiskAssessment): ExecutionDecision {
  const { overallRisk, dimensions, reasoning } = assessment;

  switch (overallRisk) {
    case 'trivial':
      return {
        strategy: { type: 'fast-path' },
        requiresConfirmation: false,
        shouldWarn: false,
      };
    case 'normal':
      return {
        strategy: { type: 'preview', preview: '' },
        requiresConfirmation: dimensions.environment === 'prod',
        shouldWarn: false,
      };
    case 'elevated':
      return {
        strategy: { type: 'iterate', maxRetries: 3 },
        requiresConfirmation: true,
        confirmationMessage: `This action has elevated risk. ${reasoning}`,
        shouldWarn: true,
        warningMessage: `⚠️ Elevated risk: ${reasoning}`,
      };
    case 'critical':
      return {
        strategy: { type: 'plan-snapshot', plan: '' },
        requiresConfirmation: true,
        confirmationMessage: buildCriticalConfirmation(dimensions, reasoning),
        shouldWarn: true,
        warningMessage: `🔴 CRITICAL: ${reasoning}`,
      };
    default:
      return {
        strategy: { type: 'iterate', maxRetries: 1 },
        requiresConfirmation: true,
        shouldWarn: true,
        warningMessage: '⚠️ Unknown risk level',
      };
  }
}

function buildCriticalConfirmation(
  dimensions: RiskDimensions,
  reasoning: string,
): string {
  const lines = [
    '⚠️  CRITICAL OPERATION',
    '',
    `Risk Assessment: ${reasoning}`,
    '',
    '📊 Dimension Scores:',
    `  • Irreversibility: ${dimensions.irreversibility}%`,
    `  • Consequences: ${dimensions.consequences}%`,
    `  • Confidence: ${dimensions.confidence}%`,
    '',
  ];

  if (dimensions.irreversibility > 80) {
    lines.push('❌ This action may NOT be reversible.');
  }
  if (dimensions.consequences > 70) {
    lines.push('⚡ This action may affect system stability.');
  }
  if (dimensions.confidence < 60) {
    lines.push('❓ The agent is uncertain about this approach.');
  }

  lines.push('', 'Proceed? [y/N]');
  return lines.join('\n');
}
