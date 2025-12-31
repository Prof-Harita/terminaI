/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BridgeState, BridgeAction } from './types';
import { BridgeActions } from './types';

export interface JsonRpcResponse {
  result?: {
    kind?: string;
    taskId?: string;
    contextId?: string;
    callId?: string;
    toolName?: string;
    args?: Record<string, unknown>;
    eventSeq?: number;
    confirmationToken?: string;
    content?: string;
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
  };
}

export interface HandleSseEventOptions {
  dispatch: (action: BridgeAction) => void;
  getState: () => BridgeState;
  onText?: (text: string) => void;
  onToolUpdate?: (update: Record<string, unknown>) => void;
  onComplete?: () => void;
}

/**
 * Checks if an event should be processed based on sequence number.
 * Guards against out-of-order or duplicate events.
 */
export function shouldProcessEvent(
  eventSeq: number | undefined,
  currentState: BridgeState,
): boolean {
  if (eventSeq === undefined) return true;
  if (!('eventSeq' in currentState)) return true;

  // Allow eventSeq=0 for new streams, otherwise must be greater than current
  if (eventSeq === 0) return true;

  if (eventSeq <= currentState.eventSeq) {
    console.warn(
      `[Bridge] Dropping out-of-order event ${eventSeq} current: ${currentState.eventSeq}`,
    );
    return false;
  }
  return true;
}

/**
 * Central SSE event processor.
 * Routes events to appropriate actions based on event kind.
 */
export function handleSseEvent(
  event: JsonRpcResponse,
  options: HandleSseEventOptions,
): void {
  const { dispatch, getState, onText, onToolUpdate, onComplete } = options;
  const currentState = getState();
  const result = event.result;
  if (!result) return;

  // Check sequencing
  if (!shouldProcessEvent(result.eventSeq, currentState)) {
    return;
  }

  // Update eventSeq if present
  if (result.eventSeq !== undefined && 'eventSeq' in currentState) {
    dispatch(BridgeActions.updateEventSeq(result.eventSeq));
  }

  const kind = result.kind;

  switch (kind) {
    case 'model-turn-started':
      // This typically means a new streaming response
      if (result.taskId && result.contextId) {
        dispatch(BridgeActions.streamStarted(result.taskId, result.contextId));
      }
      break;

    case 'model-turn-chunk':
      // Streaming text content
      if (result.content && onText) {
        onText(result.content);
      }
      break;

    case 'tool-status':
      // Tool is requesting confirmation
      if (
        result.callId &&
        result.toolName &&
        result.taskId &&
        result.contextId
      ) {
        dispatch(
          BridgeActions.confirmationRequired(
            result.taskId,
            result.contextId,
            result.callId,
            result.toolName,
            result.args || {},
            result.confirmationToken,
          ),
        );
        if (onToolUpdate) {
          onToolUpdate(result);
        }
      }
      break;

    case 'tool-completed':
      dispatch(BridgeActions.toolCompleted());
      break;

    case 'state-change':
      // Check if input is required or if stream ended
      dispatch(BridgeActions.streamEnded());
      if (onComplete) {
        onComplete();
      }
      break;

    case 'task-ended':
    case 'model-turn-ended':
      dispatch(BridgeActions.streamEnded());
      if (onComplete) {
        onComplete();
      }
      break;

    default:
      // For streaming events, ensure we're in streaming state
      if (
        result.taskId &&
        result.contextId &&
        currentState.status === 'sending'
      ) {
        dispatch(BridgeActions.streamStarted(result.taskId, result.contextId));
      }
      // Pass through other events to onToolUpdate if it looks like a tool event
      if (onToolUpdate && result.callId) {
        onToolUpdate(result);
      }
      break;
  }
}
