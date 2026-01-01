/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { handleSseEvent } from './eventHandler';

describe('Spinning/Hanging Reproduction', () => {
  it('calls onComplete when status-update indicates input-required', () => {
    const onText = vi.fn();
    const dispatch = vi.fn();
    const onComplete = vi.fn();
    const getState = () => ({ status: 'connected' }) as any;

    // precise payload from logs causing the hang
    const event = {
      result: {
        kind: 'status-update',
        taskId: '5f77c7fa-41e5-4d1c-a87e-d15aa0bb7be3',
        contextId: '7de9b151-496d-4733-ac72-dd4a97061cc0',
        status: {
          state: 'input-required',
          timestamp: '2025-12-31T09:31:26.579Z',
        },
        final: true,
      },
    };

    handleSseEvent(event, { dispatch, getState, onText, onComplete });

    // FIXED BEHAVIOR: onComplete SHOULD be called
    expect(onComplete).toHaveBeenCalled();
  });
});
