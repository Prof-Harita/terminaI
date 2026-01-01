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
    confirmationToken?: string;
    eventSeq?: number;
    content?: string;
    status?: {
      state?: string;
      message?: {
        parts?: Array<Record<string, unknown>>;
      };
    };
    metadata?: {
      coderAgent?: {
        kind?: string;
      };
      [key: string]: unknown;
    };
    artifact?: {
      artifactId?: string;
      parts?: Array<Record<string, unknown>>;
    };
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
  };
}

function extractToolCallInfoFromStatusParts(
  parts: Array<Record<string, unknown>>,
): {
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  status?: string;
  confirmationToken?: string;
} | null {
  for (const part of parts) {
    if (part?.['kind'] === 'tool-call') {
      const toolCall = part?.['toolCall'] as
        | Record<string, unknown>
        | undefined;
      const callId = toolCall?.['callId'] as string | undefined;
      const toolName = toolCall?.['toolName'] as string | undefined;
      const args =
        (toolCall?.['args'] as Record<string, unknown> | undefined) ?? {};
      const confirmationToken = toolCall?.['confirmationToken'] as
        | string
        | undefined;
      if (callId && toolName) {
        return { callId, toolName, args, confirmationToken };
      }
    }

    const kind = part?.['kind'];
    const data = part?.['data'] as Record<string, unknown> | undefined;
    const hasData = part && typeof part === 'object' && 'data' in part && data;
    if (!data || (kind !== 'data' && !hasData)) continue;

    const request = data['request'] as Record<string, unknown> | undefined;
    const callId =
      (request?.['callId'] as string | undefined) ??
      (data['callId'] as string | undefined);
    if (!callId) continue;

    const toolName =
      (request?.['name'] as string | undefined) ??
      ((data['tool'] as Record<string, unknown> | undefined)?.['name'] as
        | string
        | undefined) ??
      'unknown';
    const args =
      (request?.['args'] as Record<string, unknown> | undefined) ?? {};
    const status = data['status'] as string | undefined;
    const confirmationToken = data['confirmationToken'] as string | undefined;

    return { callId, toolName, args, status, confirmationToken };
  }

  return null;
}

function extractTextFromParts(parts: Array<Record<string, unknown>>): string {
  let out = '';
  for (const part of parts) {
    if (part?.['kind'] === 'text' && typeof part?.['text'] === 'string') {
      out += part['text'];
    }
  }
  return out;
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
  if (event.error) {
    dispatch(BridgeActions.error(event.error.message));
    return;
  }
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
      // BM-3 FIX: Only end stream on terminal states, not all state-change events
      // state-change is advisory; premature ending breaks conversation context
      {
        const stateValue =
          (result.status?.state as string) ??
          (result as Record<string, unknown>)['state'];
        const terminalStates = [
          'completed',
          'canceled',
          'failed',
          'input-required',
        ];

        if (terminalStates.includes(stateValue)) {
          dispatch(BridgeActions.streamEnded());
          if (onComplete) {
            onComplete();
          }
        }
        // Non-terminal state changes are logged but don't end the stream
      }
      break;

    case 'task-ended':
    case 'model-turn-ended':
      dispatch(BridgeActions.streamEnded());
      if (onComplete) {
        onComplete();
      }
      break;

    case 'status-update':
      if (
        currentState.status === 'sending' &&
        result.taskId &&
        result.contextId
      ) {
        dispatch(BridgeActions.streamStarted(result.taskId, result.contextId));
      }

      {
        const parts =
          (result.status?.message?.parts) ?? [];

        const text = extractTextFromParts(parts);
        if (text && onText) {
          onText(text);
        }

        const coderAgentKind = result.metadata?.coderAgent?.kind;
        const toolInfo = extractToolCallInfoFromStatusParts(parts);

        if (
          onToolUpdate &&
          (parts.some((p) => p?.['kind'] === 'data') ||
            parts.some((p) => p?.['kind'] === 'tool-call') ||
            !!toolInfo)
        ) {
          onToolUpdate(result);
        }

        if (
          toolInfo &&
          result.taskId &&
          result.contextId &&
          (coderAgentKind === 'tool-call-confirmation' ||
            toolInfo.status === 'awaiting_approval' ||
            parts.some((p) => p?.['kind'] === 'tool-call') ||
            result.status?.state === 'waiting-for-user-confirmation')
        ) {
          dispatch(
            BridgeActions.confirmationRequired(
              result.taskId,
              result.contextId,
              toolInfo.callId,
              toolInfo.toolName,
              toolInfo.args,
              toolInfo.confirmationToken,
            ),
          );
        }

        if (
          toolInfo &&
          currentState.status === 'executing_tool' &&
          ['success', 'error', 'cancelled'].includes(toolInfo.status ?? '')
        ) {
          dispatch(BridgeActions.toolCompleted());
        }

        if (result.final && currentState.status !== 'awaiting_confirmation') {
          dispatch(BridgeActions.streamEnded());
          if (onComplete) {
            onComplete();
          }
        }
      }
      break;

    case 'artifact-update':
      if (
        currentState.status === 'sending' &&
        result.taskId &&
        result.contextId
      ) {
        dispatch(BridgeActions.streamStarted(result.taskId, result.contextId));
      }

      if (
        onToolUpdate &&
        result.artifact?.artifactId &&
        result.artifact?.parts
      ) {
        const m = /^tool-(.+)-output$/.exec(result.artifact.artifactId);
        const callId = m?.[1];
        const text = extractTextFromParts(
          result.artifact.parts,
        );
        if (callId && text) {
          onToolUpdate({
            status: {
              message: {
                parts: [
                  {
                    kind: 'data',
                    data: { callId, output: text },
                  },
                ],
              },
            },
          });
        }
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
