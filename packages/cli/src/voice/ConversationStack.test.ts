/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { ConversationStack } from './ConversationStack.js';

describe('ConversationStack', () => {
  it('detects cancellation phrases', () => {
    const stack = new ConversationStack();
    const intent = stack.parseIntent('never mind that');
    const action = stack.handleIntent(intent);
    expect(action).toEqual({ action: 'CANCEL_LAST_ACTION' });
  });

  it('handles corrections and replaces last input', () => {
    const stack = new ConversationStack();
    const firstIntent = stack.parseIntent('open the file');
    stack.handleIntent(firstIntent);

    const intent = stack.parseIntent('Actually just list files');
    const action = stack.handleIntent(intent);
    expect(action).toEqual({
      action: 'REPLACE_INPUT',
      text: 'just list files',
    });
  });

  it('repeats last response when asked', () => {
    const stack = new ConversationStack();
    stack.setLastResponse('The build succeeded.');
    const intent = stack.parseIntent('repeat that');
    const action = stack.handleIntent(intent);
    expect(action).toEqual({
      action: 'SPEAK_LAST_RESPONSE',
      text: 'The build succeeded.',
    });
  });

  it('passes through normal input', () => {
    const stack = new ConversationStack();
    const intent = stack.parseIntent('write a script');
    const action = stack.handleIntent(intent);
    expect(action).toEqual({
      action: 'PROCESS_NORMALLY',
      text: 'write a script',
    });
  });
});
