/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GenerativeModel } from '@google/genai';
import { assessRisk, type RiskAssessment } from './riskAssessor.js';

export interface TaskStep {
  id: string;
  description: string;
  estimatedCommand?: string;
  dependsOn: string[];
}

export interface DecomposedTask {
  originalRequest: string;
  steps: TaskStep[];
  isMultiStep: boolean;
}

export const DECOMPOSITION_PROMPT = `
Analyze this request and break it into executable steps.

REQUEST: {request}

If this is a single atomic action, return a single step.
If this requires multiple actions, break it down.

Respond in JSON only:
{
  "steps": [
    {
      "id": "step-1",
      "description": "What this step does",
      "estimatedCommand": "the shell command if applicable",
      "dependsOn": []
    }
  ]
}
`;

interface DecompositionResponse {
  steps: TaskStep[];
}

function parseResponseText(result: unknown): DecompositionResponse {
  const text =
    typeof (result as { response?: { text?: () => string } }).response
      ?.text === 'function'
      ? (result as { response: { text: () => string } }).response.text()
      : (result as { response?: { text?: string } }).response?.text;

  if (!text) {
    throw new Error('LLM returned empty decomposition response');
  }

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.steps)) {
    throw new Error('Decomposition response missing steps');
  }
  return parsed;
}

export async function decomposeTask(
  request: string,
  model: Pick<GenerativeModel, 'generateContent'>,
): Promise<DecomposedTask> {
  const atomicPatterns = [
    /^(what|show|list|check|find|get|tell me)\b/i,
    /^(run|execute|start|stop)\s+\S+$/i,
  ];

  if (atomicPatterns.some((pattern) => pattern.test(request))) {
    return {
      originalRequest: request,
      steps: [
        {
          id: 'step-1',
          description: request,
          dependsOn: [],
        },
      ],
      isMultiStep: false,
    };
  }

  const prompt = DECOMPOSITION_PROMPT.replace('{request}', request);
  const response = await model.generateContent(prompt);
  const parsed = parseResponseText(response);

  return {
    originalRequest: request,
    steps: parsed.steps,
    isMultiStep: parsed.steps.length > 1,
  };
}

export interface AssessedStep extends TaskStep {
  assessment: RiskAssessment;
}

export interface AssessedTask extends DecomposedTask {
  assessedSteps: AssessedStep[];
  aggregateRisk: RiskAssessment['overallRisk'];
  highestRiskStep: string;
}

export async function assessDecomposedTask(
  task: DecomposedTask,
  systemContext: string,
  model: Pick<GenerativeModel, 'generateContent'>,
): Promise<AssessedTask> {
  const assessedSteps: AssessedStep[] = [];

  for (const step of task.steps) {
    const assessment = await assessRisk(
      step.description,
      step.estimatedCommand ?? null,
      systemContext,
      model,
    );
    assessedSteps.push({ ...step, assessment });
  }

  const riskLevels: Record<RiskAssessment['overallRisk'], number> = {
    trivial: 0,
    normal: 1,
    elevated: 2,
    critical: 3,
  };

  let aggregateRisk: RiskAssessment['overallRisk'] = 'trivial';
  let highestRiskStep = assessedSteps[0]?.id ?? '';

  for (const step of assessedSteps) {
    if (riskLevels[step.assessment.overallRisk] > riskLevels[aggregateRisk]) {
      aggregateRisk = step.assessment.overallRisk;
      highestRiskStep = step.id;
    }
  }

  return {
    ...task,
    assessedSteps,
    aggregateRisk,
    highestRiskStep,
  };
}
