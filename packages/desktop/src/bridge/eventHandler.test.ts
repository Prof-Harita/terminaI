/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSseEvent, shouldProcessEvent } from './eventHandler';
import type { BridgeState } from './types';

describe('handleSseEvent', () => {
  const mockDispatch = vi.fn();
  const mockOnText = vi.fn();
  const mockOnToolUpdate = vi.fn();
  const mockOnComplete = vi.fn();

  const createOptions = (state: BridgeState) => ({
    dispatch: mockDispatch,
    getState: () => state,
    onText: mockOnText,
    onToolUpdate: mockOnToolUpdate,
    onComplete: mockOnComplete,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Routing', () => {
    it('dispatches STREAM_STARTED on model-turn-started', () => {
      const state: BridgeState = { status: 'sending', text: 'hello' };
      handleSseEvent(
        {
          result: {
            kind: 'model-turn-started',
            taskId: 't1',
            contextId: 'c1',
          },
        },
        createOptions(state),
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'STREAM_STARTED',
        taskId: 't1',
        contextId: 'c1',
      });
    });

    it('dispatches CONFIRMATION_REQUIRED on tool-status', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 0,
      };
      handleSseEvent(
        {
          result: {
            kind: 'tool-status',
            taskId: 't1',
            contextId: 'c1',
            callId: 'call-1',
            toolName: 'run_command',
            args: { command: 'ls' },
            confirmationToken: 'token123',
          },
        },
        createOptions(state),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CONFIRMATION_REQUIRED',
          callId: 'call-1',
          confirmationToken: 'token123',
        }),
      );
    });

    it('dispatches TOOL_COMPLETED on tool-completed', () => {
      const state: BridgeState = {
        status: 'executing_tool',
        taskId: 't1',
        contextId: 'c1',
        callId: 'call-1',
        toolName: 'run_command',
        eventSeq: 1,
      };
      handleSseEvent(
        { result: { kind: 'tool-completed' } },
        createOptions(state),
      );
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOOL_COMPLETED' });
    });

    it('dispatches STREAM_ENDED on task-ended', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 5,
      };
      handleSseEvent({ result: { kind: 'task-ended' } }, createOptions(state));
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'STREAM_ENDED' });
    });

    it('ignores events with no result', () => {
      const state: BridgeState = { status: 'connected' };
      handleSseEvent({}, createOptions(state));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('calls onText for model-turn-chunk events', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 1,
      };
      handleSseEvent(
        { result: { kind: 'model-turn-chunk', content: 'Hello world' } },
        createOptions(state),
      );
      expect(mockOnText).toHaveBeenCalledWith('Hello world');
    });

    it('calls onComplete for state-change events', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 2,
      };
      handleSseEvent(
        { result: { kind: 'state-change' } },
        createOptions(state),
      );
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Sequencing Guard', () => {
    it('allows eventSeq=0 for new streams', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 0,
      };
      expect(shouldProcessEvent(0, state)).toBe(true);
    });

    it('allows higher eventSeq', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 5,
      };
      expect(shouldProcessEvent(6, state)).toBe(true);
    });

    it('drops out-of-order events', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 5,
      };
      expect(shouldProcessEvent(4, state)).toBe(false);
    });
  });
});
