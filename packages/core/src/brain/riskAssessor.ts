/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Minimal interface for LLM generation, compatible with the adapter built in shell.ts.
 * This avoids importing GenerativeModel which doesn't exist in @google/genai v1.30+.
 */
export interface GenerativeModelAdapter {
  generateContent: (prompt: string) => Promise<{
    response: { text: () => string };
  }>;
}
import { detectEnvironment } from './environmentDetector.js';
import { matchCommonPattern } from './patterns.js';
import { RISK_ASSESSMENT_PROMPT } from './prompts/riskAssessment.js';
import { getHistoricalContext } from './historyTracker.js';

export interface RiskDimensions {
  uniqueness: number; // 0-100 (0 = very common)
  complexity: number; // 0-100 (0 = scripted)
  irreversibility: number; // 0-100 (100 = permanent)
  consequences: number; // 0-100 (100 = systemic)
  confidence: number; // 0-100 (100 = certain)
  environment: 'dev' | 'staging' | 'prod' | 'unknown';
}

export interface RiskAssessment {
  dimensions: RiskDimensions;
  overallRisk: 'trivial' | 'normal' | 'elevated' | 'critical';
  reasoning: string;
  suggestedStrategy: 'fast-path' | 'preview' | 'iterate' | 'plan-snapshot';
}

const DEFAULT_SCORE = 50;

function clamp(value: number, min: number = 0, max: number = 100): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function applyDefaults(
  partial: Partial<RiskDimensions>,
  environment: RiskDimensions['environment'],
): RiskDimensions {
  return {
    uniqueness: clamp(partial.uniqueness ?? DEFAULT_SCORE),
    complexity: clamp(partial.complexity ?? DEFAULT_SCORE),
    irreversibility: clamp(partial.irreversibility ?? DEFAULT_SCORE),
    consequences: clamp(partial.consequences ?? DEFAULT_SCORE),
    confidence: clamp(partial.confidence ?? DEFAULT_SCORE),
    environment,
  };
}

export function assessRiskHeuristic(
  command: string,
): Partial<RiskDimensions> | null {
  return matchCommonPattern(command);
}

export function calculateOverallRisk(
  dimensions: RiskDimensions,
): RiskAssessment['overallRisk'] {
  const score =
    (dimensions.irreversibility * 0.35 +
      dimensions.consequences * 0.35 +
      dimensions.complexity * 0.15 +
      dimensions.uniqueness * 0.15) *
    (1 - dimensions.confidence / 200);

  if (score < 15) return 'trivial';
  if (score < 40) return 'normal';
  if (score < 70) return 'elevated';
  return 'critical';
}

export function selectStrategy(
  risk: RiskAssessment['overallRisk'],
  env: RiskDimensions['environment'],
): RiskAssessment['suggestedStrategy'] {
  const envMultiplier = env === 'prod' ? 1.5 : env === 'staging' ? 1.2 : 1;

  if (risk === 'trivial') return 'fast-path';
  if (risk === 'normal') return envMultiplier > 1.2 ? 'preview' : 'fast-path';
  if (risk === 'elevated') return 'preview';
  return 'plan-snapshot';
}

function parseResponseText(responseText: string): Record<string, unknown> {
  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new Error(
      `Failed to parse risk assessment response: ${(error as Error).message}`,
    );
  }
}

function readResponseText(
  response: unknown,
  fallbackReason: string,
): { text: string; reasoning?: string } {
  const rawText =
    typeof (response as { response?: { text?: () => string } }).response
      ?.text === 'function'
      ? (response as { response: { text: () => string } }).response.text()
      : // Some implementations may return the text directly on response
        (response as { response?: { text?: string } }).response?.text;

  if (!rawText) {
    return { text: '', reasoning: fallbackReason };
  }
  return { text: rawText, reasoning: undefined };
}

export async function assessRiskWithLLM(
  request: string,
  systemContext: string,
  model: GenerativeModelAdapter,
): Promise<RiskDimensions & { reasoning: string }> {
  const prompt = RISK_ASSESSMENT_PROMPT.replace('{request}', request).replace(
    '{systemContext}',
    systemContext,
  );

  const result = await model.generateContent(prompt);
  const { text, reasoning: defaultReasoning } = readResponseText(
    result,
    'LLM returned empty response',
  );
  const parsed = parseResponseText(text);

  const reasoning =
    typeof parsed['reasoning'] === 'string'
      ? (parsed['reasoning'] as string)
      : defaultReasoning ?? 'LLM risk assessment';

  return {
    uniqueness: clamp(Number(parsed['uniqueness'])),
    complexity: clamp(Number(parsed['complexity'])),
    irreversibility: clamp(Number(parsed['irreversibility'])),
    consequences: clamp(Number(parsed['consequences'])),
    confidence: clamp(Number(parsed['confidence'])),
    environment: 'unknown',
    reasoning,
  };
}

function applyHistoricalAdjustment(
  dimensions: RiskDimensions,
  command: string | null,
): { dimensions: RiskDimensions; historyNote?: string } {
  if (!command) {
    return { dimensions };
  }
  const history = getHistoricalContext(command);
  if (history.confidenceAdjustment !== 0) {
    dimensions = {
      ...dimensions,
      confidence: clamp(
        dimensions.confidence + history.confidenceAdjustment,
        0,
        100,
      ),
    };
  }
  return {
    dimensions,
    historyNote: history.reasoning,
  };
}

function buildReasoning(base: string, historyNote?: string): string {
  if (historyNote) {
    return `${base}. ${historyNote}`;
  }
  return base;
}

export async function assessRisk(
  request: string,
  command: string | null,
  systemContext: string,
  model?: GenerativeModelAdapter,
): Promise<RiskAssessment> {
  const environment = detectEnvironment();
  const heuristic = command ? assessRiskHeuristic(command) : null;

  if (heuristic && heuristic.confidence && heuristic.confidence > 80) {
    const dimensionsWithDefaults = applyDefaults(heuristic, environment);
    const { dimensions, historyNote } = applyHistoricalAdjustment(
      dimensionsWithDefaults,
      command,
    );
    const overallRisk = calculateOverallRisk(dimensions);
    return {
      dimensions,
      overallRisk,
      reasoning: buildReasoning('Matched known pattern', historyNote),
      suggestedStrategy: selectStrategy(overallRisk, dimensions.environment),
    };
  }

  let dimensions: RiskDimensions;
  let reasoning = 'Using heuristic fallback';

  if (model) {
    try {
      const llmResult = await assessRiskWithLLM(
        request,
        systemContext,
        model,
      );
      dimensions = applyDefaults(llmResult, environment);
      reasoning = llmResult.reasoning;
    } catch (error) {
      dimensions = applyDefaults({}, environment);
      reasoning = `LLM risk assessment failed: ${(
        error as Error
      ).message}. Using defaults.`;
    }
  } else {
    dimensions = applyDefaults({}, environment);
    reasoning = 'No model available; using default risk profile.';
  }

  const historical = applyHistoricalAdjustment(dimensions, command);
  const overallRisk = calculateOverallRisk(historical.dimensions);

  return {
    dimensions: historical.dimensions,
    overallRisk,
    reasoning: buildReasoning(reasoning, historical.historyNote),
    suggestedStrategy: selectStrategy(
      overallRisk,
      historical.dimensions.environment,
    ),
  };
}
