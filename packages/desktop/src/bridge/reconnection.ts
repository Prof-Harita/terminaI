/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Reconnection Detection Module
 *
 * This module provides heuristics to detect CLI restarts and handle reconnection.
 *
 * Current Strategy:
 * Without CLI modifications to send a unique instanceId, we use the following heuristics:
 * 1. If eventSeq=0 arrives when we're in streaming state with higher eventSeq, CLI may have restarted
 * 2. The confirmationToken validation in CLI provides natural protection against stale requests
 *
 * Future Enhancement:
 * When CLI sends cliInstanceId in SSE events, we can detect exact restart scenarios.
 */

import type { BridgeState, BridgeAction } from './types';
import type { JsonRpcResponse } from './eventHandler';

/**
 * Checks if the incoming event suggests a CLI restart.
 * If detected, dispatches RESET to clear stale frontend state.
 *
 * @param event - The incoming SSE event
 * @param currentState - Current bridge state
 * @param dispatch - Bridge action dispatcher
 * @returns true if reconnection was detected and handled
 */
export function checkReconnection(
  event: JsonRpcResponse,
  currentState: BridgeState,
  dispatch: (action: BridgeAction) => void,
): boolean {
  const result = event.result;
  if (!result) return false;

  // Heuristic: If we receive eventSeq=0 while in a streaming state with higher seq,
  // this likely indicates the CLI restarted mid-stream
  if (
    result.eventSeq === 0 &&
    'eventSeq' in currentState &&
    currentState.eventSeq > 0
  ) {
    console.warn(
      '[Bridge] Detected potential CLI restart (eventSeq reset to 0). Resetting state.',
    );
    dispatch({ type: 'RESET' });
    return true;
  }

  return false;
}

/**
 * Validates that the current CLI instance matches expectations.
 * This is a stub for future implementation when CLI sends instanceId.
 *
 * @param expectedInstanceId - The instanceId we expect
 * @param receivedInstanceId - The instanceId from the event
 * @returns true if instance matches or validation is not applicable
 */
export function validateCliInstance(
  expectedInstanceId: string | null,
  receivedInstanceId: string | undefined,
): boolean {
  // If we don't have an expected ID yet, accept any
  if (!expectedInstanceId) return true;

  // If event doesn't include instanceId, skip validation (backward compat)
  if (!receivedInstanceId) return true;

  // Strict match check
  return expectedInstanceId === receivedInstanceId;
}
