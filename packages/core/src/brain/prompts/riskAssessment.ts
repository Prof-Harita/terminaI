/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const RISK_ASSESSMENT_PROMPT = `
You are assessing the risk of a user request. Score each dimension 0-100.

REQUEST: {request}
CONTEXT: {systemContext}

Respond in JSON only:
{
  "uniqueness": <0-100, how rare is this type of request>,
  "complexity": <0-100, is there a known framework or is this novel>,
  "irreversibility": <0-100, can the effects be undone>,
  "consequences": <0-100, what else could break>,
  "confidence": <0-100, how confident are you in this assessment>,
  "reasoning": "<one sentence explaining the assessment>"
}
`;
