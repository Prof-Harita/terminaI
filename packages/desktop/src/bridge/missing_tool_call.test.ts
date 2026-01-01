/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { handleSseEvent } from './eventHandler';

describe('Missing Tool Call Reproduction', () => {
  it('dispatches confirmationRequired when status-update contains a tool-call', () => {
    const dispatch = vi.fn();
    const onToolUpdate = vi.fn();
    const getState = () => ({ status: 'connected' }) as any;

    // precise payload from logs causing the "awaiting tool execution" hang
    const event = {
      result: {
        kind: 'status-update',
        taskId: 'f8f8b54d-119c-491c-a9db-9c0b4021736c',
        contextId: '99570db5-2f7e-4c83-87df-57c1374a86e3',
        status: {
          state: 'waiting-for-user-confirmation',
          message: {
            kind: 'message',
            role: 'model',
            parts: [
              {
                kind: 'tool-call',
                toolCall: {
                  callId: 'run_terminal_command-123',
                  toolName: 'run_terminal_command',
                  args: { command: 'ls -F' },
                  confirmationToken: 'token123',
                },
              },
            ],
          },
        },
      },
    };

    handleSseEvent(event, { dispatch, getState, onToolUpdate });

    // CURRENT BUG: confirmationRequired is NOT dispatched
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CONFIRMATION_REQUIRED',
        callId: 'run_terminal_command-123',
        toolName: 'run_terminal_command',
      }),
    );
  });
});
