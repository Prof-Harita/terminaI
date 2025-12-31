/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BridgeState, BridgeAction } from './types';

/**
 * Pure reducer function for the Bridge FSM (Finite State Machine).
 *
 * State Transition Diagram:
 * ```
 * disconnected ──CONNECT──> connecting ──CONNECTED──> connected
 *      ↑                                                  │
 *      │                                            SEND_MESSAGE
 *   RESET │                                                ↓
 *      │                                              sending
 *      │                                                  │
 *      │                                          STREAM_STARTED
 *      │                                                  ↓
 *      │    ┌──────────────────────────────────────> streaming <──TOOL_COMPLETED──┐
 *      │    │                                            │                        │
 *      │    │                                   CONFIRMATION_REQUIRED             │
 *      │    │                                            ↓                        │
 *      │  STREAM_ENDED                        awaiting_confirmation               │
 *      │    │                                            │                        │
 *      │    │                                    CONFIRMATION_SENT                │
 *      │    │                                            ↓                        │
 *      │    └─────────────────────────────────── executing_tool ──────────────────┘
 *      │
 *   DISCONNECTED (from any state)
 * ```
 *
 * @param state - Current bridge state (discriminated union)
 * @param action - Action to apply
 * @returns New state (may be same object if action is invalid for current state)
 */
export function bridgeReducer(
  state: BridgeState,
  action: BridgeAction,
): BridgeState {
  switch (action.type) {
    case 'CONNECT':
      if (state.status !== 'disconnected') {
        console.warn('[Bridge] Cannot CONNECT from', state.status);
        return state;
      }
      return { status: 'connecting' };

    case 'CONNECTED':
      if (state.status !== 'connecting') {
        console.warn('[Bridge] Cannot CONNECTED from', state.status);
        return state;
      }
      return { status: 'connected' };

    case 'SEND_MESSAGE':
      if (state.status !== 'connected') {
        console.warn('[Bridge] Cannot SEND_MESSAGE from', state.status);
        return state;
      }
      return { status: 'sending', text: action.text };

    case 'STREAM_STARTED':
      // Allow from 'sending' (normal flow) or 'streaming' (idempotent for rapid events)
      if (state.status !== 'sending' && state.status !== 'streaming') {
        console.warn('[Bridge] Cannot STREAM_STARTED from', state.status);
        return state;
      }
      // If already streaming with same taskId, this is idempotent
      if (state.status === 'streaming' && state.taskId === action.taskId) {
        return state;
      }
      return {
        status: 'streaming',
        taskId: action.taskId,
        contextId: action.contextId,
        eventSeq: 0,
      };

    case 'CONFIRMATION_REQUIRED':
      if (state.status !== 'streaming') {
        console.warn(
          '[Bridge] Cannot CONFIRMATION_REQUIRED from',
          state.status,
        );
        return state;
      }
      return {
        status: 'awaiting_confirmation',
        taskId: action.taskId,
        contextId: action.contextId,
        callId: action.callId,
        toolName: action.toolName,
        args: action.args,
        eventSeq: state.eventSeq,
        confirmationToken: action.confirmationToken,
      };

    case 'CONFIRMATION_SENT':
      if (state.status !== 'awaiting_confirmation') {
        console.warn('[Bridge] Cannot CONFIRMATION_SENT from', state.status);
        return state;
      }
      return {
        status: 'executing_tool',
        taskId: state.taskId,
        contextId: state.contextId,
        callId: state.callId,
        toolName: state.toolName,
        eventSeq: state.eventSeq,
      };

    case 'TOOL_COMPLETED':
      if (state.status !== 'executing_tool') {
        console.warn('[Bridge] Cannot TOOL_COMPLETED from', state.status);
        return state;
      }
      return {
        status: 'streaming',
        taskId: state.taskId,
        contextId: state.contextId,
        eventSeq: state.eventSeq,
      };

    case 'STREAM_ENDED':
      // Allow from streaming, executing_tool, OR awaiting_confirmation
      // (CLI may send input-required while user hasn't responded yet)
      if (
        state.status !== 'streaming' &&
        state.status !== 'executing_tool' &&
        state.status !== 'awaiting_confirmation'
      ) {
        console.warn('[Bridge] Cannot STREAM_ENDED from', state.status);
        return state;
      }
      return { status: 'connected' };

    case 'DISCONNECTED':
      return { status: 'disconnected' };

    case 'RESET':
      return { status: 'disconnected' };

    case 'UPDATE_EVENT_SEQ':
      if ('eventSeq' in state) {
        return { ...state, eventSeq: action.eventSeq };
      }
      return state;

    default:
      return state;
  }
}
