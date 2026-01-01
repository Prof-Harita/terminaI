/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { handleConfidence } from '../confidenceHandler.js';

describe('confidenceHandler', () => {
  it('proceeds when confidence is very high', () => {
    expect(handleConfidence(95, 'anything')).toEqual({ type: 'proceed' });
  });

  it('narrates uncertainty when moderately confident', () => {
    const action = handleConfidence(75, 'deploy');
    expect(action.type).toBe('narrate-uncertainty');
    expect(action.message).toBeTruthy();
  });

  it('runs diagnostics when confidence is middling', () => {
    const action = handleConfidence(60, 'network issue');
    expect(action.type).toBe('diagnostic-first');
    expect(action.diagnosticCommand).toContain('ping');
  });

  it('asks for clarification when confidence is low', () => {
    const action = handleConfidence(40, 'unknown task');
    expect(action.type).toBe('ask-clarification');
    expect(action.clarificationQuestion).toContain('unknown task');
  });
});
