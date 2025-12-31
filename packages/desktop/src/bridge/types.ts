/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type BridgeState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'sending'; text: string }
  | {
      status: 'streaming';
      taskId: string;
      contextId: string;
      eventSeq: number;
    }
  | {
      status: 'awaiting_confirmation';
      taskId: string;
      contextId: string;
      callId: string;
      toolName: string;
      args: Record<string, unknown>;
      eventSeq: number;
      confirmationToken?: string;
    }
  | {
      status: 'executing_tool';
      taskId: string;
      contextId: string;
      callId: string;
      toolName: string;
      eventSeq: number;
    };

export interface ConfirmationIdentity {
  taskId: string;
  callId: string;
  confirmationToken?: string;
}

export type BridgeAction =
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED'; reason?: string }
  | { type: 'SEND_MESSAGE'; text: string }
  | { type: 'STREAM_STARTED'; taskId: string; contextId: string }
  | {
      type: 'CONFIRMATION_REQUIRED';
      taskId: string;
      contextId: string;
      callId: string;
      toolName: string;
      args: Record<string, unknown>;
      confirmationToken?: string;
    }
  | { type: 'CONFIRMATION_SENT' }
  | { type: 'TOOL_COMPLETED' }
  | { type: 'STREAM_ENDED' }
  | { type: 'RESET' }
  | { type: 'UPDATE_EVENT_SEQ'; eventSeq: number }
  | { type: 'ERROR'; message: string };

export const BridgeActions = {
  connect: (): BridgeAction => ({ type: 'CONNECT' }),
  connected: (): BridgeAction => ({ type: 'CONNECTED' }),
  disconnected: (reason?: string): BridgeAction => ({
    type: 'DISCONNECTED',
    reason,
  }),
  sendMessage: (text: string): BridgeAction => ({
    type: 'SEND_MESSAGE',
    text,
  }),
  streamStarted: (taskId: string, contextId: string): BridgeAction => ({
    type: 'STREAM_STARTED',
    taskId,
    contextId,
  }),
  confirmationRequired: (
    taskId: string,
    contextId: string,
    callId: string,
    toolName: string,
    args: Record<string, unknown>,
    confirmationToken?: string,
  ): BridgeAction => ({
    type: 'CONFIRMATION_REQUIRED',
    taskId,
    contextId,
    callId,
    toolName,
    args,
    confirmationToken,
  }),
  confirmationSent: (): BridgeAction => ({ type: 'CONFIRMATION_SENT' }),
  toolCompleted: (): BridgeAction => ({ type: 'TOOL_COMPLETED' }),
  streamEnded: (): BridgeAction => ({ type: 'STREAM_ENDED' }),
  reset: (): BridgeAction => ({ type: 'RESET' }),
  updateEventSeq: (eventSeq: number): BridgeAction => ({
    type: 'UPDATE_EVENT_SEQ',
    eventSeq,
  }),
  error: (message: string): BridgeAction => ({
    type: 'ERROR',
    message,
  }),
};
