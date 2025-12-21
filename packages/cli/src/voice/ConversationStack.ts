/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConversationFrame = {
  input: string;
  timestamp: number;
};

export type ConversationIntent =
  | { type: 'CANCEL' }
  | { type: 'CORRECTION'; newContext: string }
  | { type: 'REPEAT_LAST' }
  | { type: 'NEW_INPUT'; text: string };

export type ConversationAction =
  | { action: 'CANCEL_LAST_ACTION' }
  | { action: 'REPLACE_INPUT'; text: string }
  | { action: 'SPEAK_LAST_RESPONSE'; text: string | null }
  | { action: 'PROCESS_NORMALLY'; text: string };

export class ConversationStack {
  private readonly stack: ConversationFrame[] = [];
  private lastResponse: string | null = null;

  parseIntent(transcript: string): ConversationIntent {
    const normalized = transcript.trim();
    const lower = normalized.toLowerCase();

    if (/^(never ?mind|cancel|stop|forget it)\b/.test(lower)) {
      return { type: 'CANCEL' };
    }

    if (/^(wait|actually|no|sorry|i meant)\b/.test(lower)) {
      const replacement = normalized.replace(
        /^(wait|actually|no|sorry|i meant)[,.]?\s*/i,
        '',
      );
      return { type: 'CORRECTION', newContext: replacement.trim() };
    }

    if (
      /^(huh|repeat|say that again)\b/.test(lower) ||
      /^(what|pardon)\W*$/.test(lower)
    ) {
      return { type: 'REPEAT_LAST' };
    }

    return { type: 'NEW_INPUT', text: normalized };
  }

  handleIntent(intent: ConversationIntent): ConversationAction {
    switch (intent.type) {
      case 'CANCEL': {
        this.stack.pop();
        return { action: 'CANCEL_LAST_ACTION' };
      }
      case 'CORRECTION': {
        this.stack.pop();
        const clean = intent.newContext || '';
        this.pushInput(clean);
        return { action: 'REPLACE_INPUT', text: clean };
      }
      case 'REPEAT_LAST': {
        return { action: 'SPEAK_LAST_RESPONSE', text: this.lastResponse };
      }
      case 'NEW_INPUT': {
        const clean = intent.text.trim();
        this.pushInput(clean);
        return { action: 'PROCESS_NORMALLY', text: clean };
      }
      default:
        return { action: 'PROCESS_NORMALLY', text: '' };
    }
  }

  setLastResponse(text: string): void {
    const normalized = text.trim();
    if (normalized) {
      this.lastResponse = normalized;
    }
  }

  reset(): void {
    this.stack.length = 0;
    this.lastResponse = null;
  }

  private pushInput(input: string): void {
    if (!input) return;
    this.stack.push({ input, timestamp: Date.now() });
  }
}
