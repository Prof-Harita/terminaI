/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useBridgeStore } from '../bridge/store';
import { BridgeActions } from '../bridge/types';
import { useExecutionStore } from '../stores/executionStore';

/**
 * Service responsible for managing the lifecycle of a chat session.
 * Handles the "heavy lifting" of resetting state, aborting streams, and generating new IDs.
 */
export class SessionManager {
  /**
   * Starts a fresh session.
   * 1. Signals global abort via Disconnect
   * 2. Generates new atomic Session ID
   * 3. Clears Execution Store (TabLock equivalent)
   */
  static startNewSession(): void {
    const bridgeStore = useBridgeStore.getState();
    const executionStore = useExecutionStore.getState();

    // 1. Signal Abort (triggers UI reset)
    // We use 'Session Reset' as the reason, which keeps the UI clean.
    bridgeStore.dispatch(BridgeActions.disconnected('Session Reset'));

    // 2. Generate new Atomic ID
    const newId = crypto.randomUUID();
    bridgeStore.setCurrentConversationId(newId);

    // 3. Clear Execution State (releases any locks/waiting states)
    executionStore.clearEvents();

    console.log('[SessionManager] Started new session:', newId);
  }

  /**
   * Resumes an existing session.
   * 1. Signals global abort (active streams)
   * 2. Sets persistent Conversation ID
   * 3. Clears execution state
   */
  static resumeSession(sessionId: string): void {
    const bridgeStore = useBridgeStore.getState();
    const executionStore = useExecutionStore.getState();

    // 1. Signal Abort (triggers UI reset and stops active streams)
    bridgeStore.dispatch(BridgeActions.disconnected('Session Switched'));

    // 2. Set Existing ID
    bridgeStore.setCurrentConversationId(sessionId);

    // 3. Clear Execution State
    executionStore.clearEvents();

    console.log('[SessionManager] Resumed session:', sessionId);
  }
}
