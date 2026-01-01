/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { bridgeReducer } from './reducer';
import type { BridgeState } from './types';

describe('bridgeReducer', () => {
  it('transitions from disconnected to connecting on CONNECT', () => {
    const state: BridgeState = { status: 'disconnected' };
    const result = bridgeReducer(state, { type: 'CONNECT' });
    expect(result.status).toBe('connecting');
  });

  it('guards against CONNECT when not disconnected', () => {
    const state: BridgeState = { status: 'connected' };
    const result = bridgeReducer(state, { type: 'CONNECT' });
    expect(result.status).toBe('connected'); // unchanged
  });

  it('stores taskId atomically with callId on CONFIRMATION_REQUIRED', () => {
    const state: BridgeState = {
      status: 'streaming',
      taskId: 'task-1',
      contextId: 'ctx-1',
      eventSeq: 0,
    };
    const result = bridgeReducer(state, {
      type: 'CONFIRMATION_REQUIRED',
      taskId: 'task-1',
      contextId: 'ctx-1',
      callId: 'call-1',
      toolName: 'run_command',
      args: {},
      confirmationToken: 'signed.token.base64',
    });

    expect(result.status).toBe('awaiting_confirmation');
    if (result.status === 'awaiting_confirmation') {
      expect(result.taskId).toBe('task-1');
      expect(result.callId).toBe('call-1');
      expect(result.confirmationToken).toBe('signed.token.base64');
    }
  });

  it('preserves taskId through CONFIRMATION_SENT', () => {
    const state: BridgeState = {
      status: 'awaiting_confirmation',
      taskId: 'task-1',
      contextId: 'ctx-1',
      callId: 'call-1',
      toolName: 'run_command',
      args: {},
      eventSeq: 1,
      confirmationToken: 'token',
    };
    const result = bridgeReducer(state, { type: 'CONFIRMATION_SENT' });

    expect(result.status).toBe('executing_tool');
    if (result.status === 'executing_tool') {
      expect(result.taskId).toBe('task-1');
      expect(result.callId).toBe('call-1');
    }
  });

  it('guards against invalid CONFIRMATION_SENT', () => {
    const state: BridgeState = {
      status: 'streaming',
      taskId: 't1',
      contextId: 'c1',
      eventSeq: 0,
    };
    const result = bridgeReducer(state, { type: 'CONFIRMATION_SENT' });
    expect(result).toBe(state);
  });

  it('allows STREAM_ENDED from awaiting_confirmation', () => {
    const state: BridgeState = {
      status: 'awaiting_confirmation',
      taskId: 'task-1',
      contextId: 'ctx-1',
      callId: 'call-1',
      toolName: 'run_command',
      args: {},
      eventSeq: 1,
    };
    const result = bridgeReducer(state, { type: 'STREAM_ENDED' });
    expect(result.status).toBe('connected');
  });

  it('is idempotent for STREAM_STARTED when already streaming same task', () => {
    const state: BridgeState = {
      status: 'streaming',
      taskId: 'task-1',
      contextId: 'ctx-1',
      eventSeq: 5,
    };
    const result = bridgeReducer(state, {
      type: 'STREAM_STARTED',
      taskId: 'task-1',
      contextId: 'ctx-1',
    });
    expect(result).toBe(state);
  });

  it('transitions from streaming to new task on STREAM_STARTED with different taskId', () => {
    const state: BridgeState = {
      status: 'streaming',
      taskId: 'task-1',
      contextId: 'ctx-1',
      eventSeq: 5,
    };
    const result = bridgeReducer(state, {
      type: 'STREAM_STARTED',
      taskId: 'task-2',
      contextId: 'ctx-2',
    });
    expect(result.status).toBe('streaming');
    if (result.status === 'streaming') {
      expect(result.taskId).toBe('task-2');
      expect(result.eventSeq).toBe(0);
    }
  });
});
