/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConfidenceAction {
  type:
    | 'proceed'
    | 'narrate-uncertainty'
    | 'diagnostic-first'
    | 'ask-clarification';
  message?: string;
  diagnosticCommand?: string;
  clarificationQuestion?: string;
}

export function handleConfidence(
  confidence: number,
  context: string,
): ConfidenceAction {
  if (confidence >= 90) {
    return { type: 'proceed' };
  }

  if (confidence >= 70) {
    return {
      type: 'narrate-uncertainty',
      message:
        "I'm fairly confident this is the right approach, but let me verify as we go...",
    };
  }

  if (confidence >= 50) {
    const diagnostic = suggestDiagnostic(context);
    return {
      type: 'diagnostic-first',
      message: 'Before proceeding, let me gather more information.',
      diagnosticCommand: diagnostic,
    };
  }

  return {
    type: 'ask-clarification',
    clarificationQuestion: generateClarifyingQuestion(context),
  };
}

function suggestDiagnostic(context: string): string {
  const normalized = context.toLowerCase();
  if (normalized.includes('network') || normalized.includes('wifi')) {
    return 'ip addr && ping -c 1 8.8.8.8';
  }
  if (normalized.includes('disk') || normalized.includes('storage')) {
    return 'df -h && du -sh /* 2>/dev/null | sort -hr | head -10';
  }
  if (normalized.includes('memory') || normalized.includes('ram')) {
    return 'free -h && ps aux --sort=-%mem | head -10';
  }
  if (normalized.includes('process') || normalized.includes('cpu')) {
    return 'top -bn1 | head -15';
  }
  return 'echo "System context needed"';
}

function generateClarifyingQuestion(context: string): string {
  const snippet = context.slice(0, 50);
  return `I'm not sure I understand completely. Could you clarify what you mean by "${snippet}..."?`;
}
