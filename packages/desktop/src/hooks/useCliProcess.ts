/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '../types/cli';
import { readSseStream } from '../utils/sse';

import { useSettingsStore } from '../stores/settingsStore';
import { useVoiceStore } from '../stores/voiceStore';
import { useTts } from './useTts';
import { useExecutionStore } from '../stores/executionStore';
import { useHistoryStore } from '../stores/historyStore';
import { deriveSpokenReply } from '../utils/spokenReply';
import { postToAgent } from '../utils/agentClient';

// Phase 4 Imports
import { useBridgeStore } from '../bridge/store';
import { BridgeActions } from '../bridge/types';
import { handleSseEvent, type JsonRpcResponse } from '../bridge/eventHandler';
import { TabLock } from '../bridge/tabLock';

const BLOCKING_PROMPT_REGEX =
  /^.*(password|\[y\/n\]|confirm|enter value|sudo).*:/i;

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

/**
 * Hook for managing CLI process communication with A2A backend.
 * @returns {Object} Hook state and methods
 * @returns {Message[]} messages - Array of chat messages
 * @returns {boolean} isConnected - Whether connected to agent
 * @returns {boolean} isProcessing - Whether agent is processing
 * @returns {string | null} activeTerminalSession - Active terminal session ID
 * @returns {function} sendMessage - Send message to agent
 * @returns {function} respondToConfirmation - Respond to tool confirmation
 * @returns {function} closeTerminal - Close terminal session
 */
export function useCliProcess(options?: { onComplete?: () => void }) {
  const agentUrl = useSettingsStore((s) => s.agentUrl);
  const agentToken = useSettingsStore((s) => s.agentToken);

  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceVolume = useSettingsStore((s) => s.voiceVolume);

  const voiceState = useVoiceStore((s) => s.state);
  const startSpeaking = useVoiceStore((s) => s.startSpeaking);
  const stopSpeaking = useVoiceStore((s) => s.stopSpeaking);

  // Bridge Store
  const bridgeState = useBridgeStore((s) => s.state);
  const dispatch = useBridgeStore((s) => s.dispatch);
  const isConnected = useBridgeStore((s) => s.isConnected());
  const isProcessing = useBridgeStore((s) => s.isProcessing());
  const currentTaskId = useBridgeStore((s) => s.getCurrentTaskId());

  // Tab Lock
  const tabLockRef = useRef<TabLock | null>(null);
  useEffect(() => {
    tabLockRef.current = new TabLock();

    // Release lock on page unload to prevent stale locks
    const handleUnload = () => {
      tabLockRef.current?.release();
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      tabLockRef.current?.release();
    };
  }, []);

  const {
    addToolEvent,
    updateToolEvent,
    appendTerminalOutput,
    setToolStatus,
    setWaitingForInput,
    setActiveTaskId, // Now from ExecutionStore
  } = useExecutionStore();

  const [messages, setMessages] = useState<Message[]>([]);

  // We no longer use activeTaskId/pendingConfirmationTaskId from ExecutionStore for logic
  // But we might need to sync activeTaskId to ExecutionStore for UI components that rely on it?
  // Ideally, UI should migrate to BridgeStore, but for backward compat, we can sync.

  useEffect(() => {
    if (currentTaskId) {
      setActiveTaskId(currentTaskId);
    }
  }, [currentTaskId, setActiveTaskId]);

  const activeStreamAbortRef = useRef<AbortController | null>(null);
  const currentAssistantTextRef = useRef<string>('');
  const lastSpokenAssistantTextRef = useRef<string>('');
  const lastSpokenConfirmationCallIdRef = useRef<string | null>(null);
  const messageQueueRef = useRef<string[]>([]);

  // Queue processing moved to after sendMessage definition to avoid hoisting issues

  const { speak, stop } = useTts({
    onEnd: () => stopSpeaking(),
  });

  useEffect(() => {
    if (voiceState === 'LISTENING') {
      stop();
    }
  }, [voiceState, stop]);

  // Helper to update last assistant message
  const appendToAssistant = useCallback((text: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        currentAssistantTextRef.current = last.content + text;
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + text },
        ];
      }
      currentAssistantTextRef.current = text;
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          events: [],
        },
      ];
    });
  }, []);

  const startAssistantMessage = useCallback(() => {
    const id = crypto.randomUUID();
    lastSpokenAssistantTextRef.current = '';
    currentAssistantTextRef.current = '';
    setMessages((prev) => [
      ...prev,
      { id, role: 'assistant', content: '', events: [] },
    ]);
  }, []);

  // --- Bridge Handlers ---

  const handleBridgeText = useCallback(
    (text: string) => {
      appendToAssistant(text);
    },
    [appendToAssistant],
  );

  const handleBridgeToolUpdate = useCallback(
    (result: any) => {
      // Logic lifted from old handleJsonRpc for tool-call-update
      setToolStatus('Agent is executing tools...');
      const parts = result.status?.message?.parts ?? [];
      for (const part of parts) {
        const hasData =
          part && typeof part === 'object' && 'data' in part && part.data;
        if ((part?.kind === 'data' || hasData) && part.data) {
          const toolData = part.data;
          const callId =
            toolData?.request?.callId ??
            toolData?.callId ??
            crypto.randomUUID();

          const existingEvent = useExecutionStore
            .getState()
            .toolEvents.find((e) => e.id === callId);

          if (toolData.request && !existingEvent) {
            addToolEvent({
              id: callId,
              toolName: toolData.request.name,
              inputArguments: toolData.request.args ?? {},
              status: 'running',
              terminalOutput: '',
              startedAt: Date.now(),
            });
          }

          const output = toolData?.output ?? toolData?.result;
          if (typeof output === 'string') {
            if (existingEvent || toolData.request) {
              appendTerminalOutput(callId, output);
            }
            if (BLOCKING_PROMPT_REGEX.test(output)) {
              setWaitingForInput(true);
            }
          }

          if (
            ['completed', 'failed', 'success', 'error', 'cancelled'].includes(
              toolData.status,
            )
          ) {
            updateToolEvent(callId, {
              status: ['success', 'completed'].includes(toolData.status)
                ? 'completed'
                : 'failed',
              completedAt: Date.now(),
            });
          }
        }
      }
    },
    [
      addToolEvent,
      appendTerminalOutput,
      setToolStatus,
      setWaitingForInput,
      updateToolEvent,
    ],
  );

  // Handle Voice for Confirmations (Sync with Bridge State)
  useEffect(() => {
    if (bridgeState.status === 'awaiting_confirmation' && voiceEnabled) {
      const { callId, toolName } = bridgeState;
      if (lastSpokenConfirmationCallIdRef.current !== callId) {
        lastSpokenConfirmationCallIdRef.current = callId;
        const prompt = `Allow running tool "${toolName}"?`;
        const spoken = deriveSpokenReply(prompt, 30);
        if (spoken) {
          const signal = startSpeaking();
          void speak(spoken, {
            signal,
            volume: Math.max(0, Math.min(1, voiceVolume / 100)),
          });
        }
      }
    }
  }, [bridgeState, voiceEnabled, voiceVolume, speak, startSpeaking]);

  // Handle Voice for Completion (Sync with Bridge State)
  useEffect(() => {
    // Detect transition to connected (idle) from processing
    // But we need to know if we just finished a turn.
    // The bridge doesn't explicitly have "JustFinished", but "connected" means idle.
    // We can use a ref to track if we were processing.
  }, []); // TODO: Add sophisticated completion voice logic if strict parity needed.
  // For now, onComplete callback in handleSseEvent handles this?
  // handleSseEvent calls options.onComplete.

  const onBridgeComplete = useCallback(() => {
    setToolStatus(null);
    setWaitingForInput(false);
    options?.onComplete?.();

    if (voiceEnabled) {
      const assistantText = currentAssistantTextRef.current;
      const spoken = deriveSpokenReply(assistantText, 30);
      if (spoken && spoken !== lastSpokenAssistantTextRef.current) {
        lastSpokenAssistantTextRef.current = spoken;
        const signal = startSpeaking();
        void speak(spoken, {
          signal,
          volume: Math.max(0, Math.min(1, voiceVolume / 100)),
        });
      }
    }
  }, [
    options,
    setToolStatus,
    setWaitingForInput,
    voiceEnabled,
    startSpeaking,
    speak,
    voiceVolume,
  ]);

  // --- Actions ---

  const checkConnection = useCallback(async () => {
    const baseUrl = normalizeBaseUrl(agentUrl);
    if (!baseUrl) {
      dispatch(BridgeActions.disconnected('No Base URL'));
      return;
    }
    try {
      if (bridgeState.status === 'disconnected') {
        dispatch(BridgeActions.connect());
      }
      const health = await fetch(`${baseUrl}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(500),
      });
      if (health.ok) {
        dispatch(BridgeActions.connected());
      } else {
        dispatch(BridgeActions.disconnected('Health check failed'));
      }
    } catch (e) {
      dispatch(BridgeActions.disconnected(String(e)));
    }
  }, [agentUrl, bridgeState.status, dispatch]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  // IMPORTANT FIX: Track pending message text for history recording after STREAM_STARTED
  const pendingHistoryTextRef = useRef<string | null>(null);

  // IMPORTANT FIX: Record pending history when taskId becomes available
  useEffect(() => {
    if (currentTaskId && pendingHistoryTextRef.current) {
      const text = pendingHistoryTextRef.current;
      pendingHistoryTextRef.current = null; // Clear to prevent duplicate recording
      useHistoryStore.getState().addSession({
        id: currentTaskId,
        title: text.length > 30 ? text.slice(0, 30) + '...' : text,
        lastMessage: text,
        timestamp: Date.now(),
      });
    }
  }, [currentTaskId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const baseUrl = normalizeBaseUrl(agentUrl);
      const token = agentToken?.trim();

      if (!baseUrl || !token) {
        dispatch(BridgeActions.disconnected('Missing config'));
        appendToAssistant(
          '\n[Not connected] Set Agent URL + Token in Settings.\n',
        );
        return;
      }

      if (isProcessing) {
        messageQueueRef.current.push(text);
        return;
      }

      // 1. Dispatch SEND_MESSAGE
      dispatch(BridgeActions.sendMessage(text));

      // 2. Update UI State (Messages)
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        events: [],
      };
      setMessages((prev) => [...prev, userMessage]);

      // IMPORTANT FIX: For first message, store text and record history after STREAM_STARTED
      // This ensures we capture the real taskId instead of using 'default'
      if (currentTaskId) {
        useHistoryStore.getState().addSession({
          id: currentTaskId,
          title: text.length > 30 ? text.slice(0, 30) + '...' : text,
          lastMessage: text,
          timestamp: Date.now(),
        });
      } else {
        // First message - store for recording after stream starts
        pendingHistoryTextRef.current = text;
      }

      useExecutionStore.getState().clearEvents();
      startAssistantMessage();

      // 3. Setup Stream
      activeStreamAbortRef.current?.abort();
      const abortController = new AbortController();
      activeStreamAbortRef.current = abortController;

      const messageId = crypto.randomUUID();
      const body = {
        jsonrpc: '2.0',
        id: '1',
        method: 'message/stream',
        params: {
          message: {
            kind: 'message',
            role: 'user',
            parts: [{ kind: 'text', text }],
            messageId,
          },
          // BM-1 FIX: Always include taskId if we have a conversation
          // currentTaskId now comes from persistent currentConversationId
          ...(currentTaskId ? { taskId: currentTaskId } : {}),
        },
      };

      try {
        const stream = await postToAgent(
          baseUrl,
          token,
          body,
          abortController.signal,
        );

        await readSseStream(stream, (msg) => {
          if (!tabLockRef.current?.isLocked()) {
            // If not locked, maybe warn? Or just process anyway since we initiated?
            // For this refactor, we assume the initiator IS the leader.
          }
          try {
            const parsed = JSON.parse(msg.data) as JsonRpcResponse;
            handleSseEvent(parsed, {
              dispatch,
              getState: () => useBridgeStore.getState().state,
              onText: handleBridgeText,
              onToolUpdate: handleBridgeToolUpdate,
              onComplete: onBridgeComplete,
            });
          } catch (e) {
            console.error('[Bridge] JSON parse error', e);
          }
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        dispatch(BridgeActions.error(msg));
        appendToAssistant(`\n[Agent request failed] ${msg}\n`);
      }
    },
    [
      agentUrl,
      agentToken,
      isProcessing,
      dispatch,
      currentTaskId,
      startAssistantMessage,
      handleBridgeText,
      handleBridgeToolUpdate,
      onBridgeComplete,
    ],
  );

  const respondToConfirmation = useCallback(
    async (callId: string, approved: boolean, pin?: string) => {
      const baseUrl = normalizeBaseUrl(agentUrl);
      const token = agentToken?.trim();

      // Get confirmation identity from Store (Token aware!)
      const identity = useBridgeStore.getState().getConfirmationIdentity();

      if (!baseUrl || !token || !identity) {
        console.error('[Bridge] Cannot respond: missing config or identity');
        return;
      }

      // Verify callId matches
      if (identity.callId !== callId) {
        console.warn(
          `[Bridge] CallId mismatch in response. Store: ${identity.callId}, UI: ${callId}`,
        );
        // Proceed with Store's ID? Or fail? Fail safe.
        return;
      }

      dispatch(BridgeActions.confirmationSent());

      startAssistantMessage(); // Optional: Start new bubble for response?

      activeStreamAbortRef.current?.abort(); // Abort previous stream (usual A2A pattern)
      const abortController = new AbortController();
      activeStreamAbortRef.current = abortController;

      const body = {
        jsonrpc: '2.0',
        id: '1',
        method: 'message/stream',
        params: {
          message: {
            kind: 'message',
            role: 'user',
            parts: [
              {
                kind: 'data',
                data: {
                  callId: identity.callId, // Use AUTHORITATIVE ID
                  outcome: approved ? 'proceed_once' : 'cancel',
                  ...(pin ? { pin } : {}),
                  // Phase 0: Include token if present
                  ...(identity.confirmationToken
                    ? { confirmationToken: identity.confirmationToken }
                    : {}),
                },
              },
            ],
            messageId: crypto.randomUUID(),
          },
          taskId: identity.taskId, // Use AUTHORITATIVE Task ID
        },
      };

      try {
        const stream = await postToAgent(
          baseUrl,
          token,
          body,
          abortController.signal,
        );
        await readSseStream(stream, (msg) => {
          try {
            const parsed = JSON.parse(msg.data) as JsonRpcResponse;
            handleSseEvent(parsed, {
              dispatch,
              getState: () => useBridgeStore.getState().state,
              onText: handleBridgeText,
              onToolUpdate: handleBridgeToolUpdate,
              onComplete: onBridgeComplete,
            });
          } catch (e) {
            console.error('[Bridge] Confirmation SSE Parse Error', e);
          }
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        dispatch(BridgeActions.error(msg));
        appendToAssistant(`\n[Agent request failed] ${msg}\n`);
      }
    },
    [
      agentUrl,
      agentToken,
      dispatch,
      startAssistantMessage,
      handleBridgeText,
      handleBridgeToolUpdate,
      onBridgeComplete,
    ],
  );

  // Queue processing - moved here
  useEffect(() => {
    if (!isProcessing && messageQueueRef.current.length > 0) {
      const nextMessage = messageQueueRef.current.shift();
      if (nextMessage) {
        setTimeout(() => sendMessage(nextMessage), 0);
      }
    }
  }, [isProcessing, sendMessage]);

  const sendToolInput = useCallback(
    async (callId: string, input: string) => {
      const baseUrl = normalizeBaseUrl(agentUrl);
      const token = agentToken?.trim();
      const tid = currentTaskId;

      if (!baseUrl || !token || !tid) return;

      const body = {
        jsonrpc: '2.0',
        id: '1',
        method: 'message/stream',
        params: {
          message: {
            kind: 'message',
            role: 'user',
            parts: [
              {
                kind: 'data',
                data: { callId, input },
              },
            ],
            messageId: crypto.randomUUID(),
          },
          taskId: tid,
        },
      };

      try {
        await postToAgent(baseUrl, token, body);
      } catch (e) {
        console.error('Failed to send tool input', e);
      }
    },
    [agentUrl, agentToken, currentTaskId],
  );

  const stopAgent = useCallback(() => {
    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current.abort();
      activeStreamAbortRef.current = null;
    }
    messageQueueRef.current = [];
    // Dispatch STREAM_ENDED to reset to connected state (not DISCONNECTED which breaks connection)
    // This allows the user to continue sending messages without re-establishing connection
    dispatch(BridgeActions.streamEnded());
  }, [dispatch]);

  return {
    messages,
    isConnected,
    isProcessing,
    activeTerminalSession: null,
    sendMessage,
    respondToConfirmation,
    sendToolInput,
    closeTerminal: () => {},
    stop: stopAgent,
  };
}
