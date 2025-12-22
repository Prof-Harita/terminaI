/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '../types/cli';
import { readSseStream } from '../utils/sse';
import { hmacSha256Hex, sha256Hex } from '../utils/webCrypto';
import { useSettingsStore } from '../stores/settingsStore';
import { useVoiceStore } from '../stores/voiceStore';
import { useTts } from './useTts';
import { deriveSpokenReply } from '../utils/spokenReply';

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any;
};

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

async function buildSignedHeaders(input: {
  token: string;
  method: string;
  pathWithQuery: string;
  bodyString: string;
}) {
  const nonce = crypto.randomUUID();
  const bodyHash = await sha256Hex(input.bodyString);
  const payload = [
    input.method.toUpperCase(),
    input.pathWithQuery,
    bodyHash,
    nonce,
  ].join('\n');
  const signature = await hmacSha256Hex(input.token, payload);
  return {
    Authorization: `Bearer ${input.token}`,
    'X-Gemini-Nonce': nonce,
    'X-Gemini-Signature': signature,
  };
}

export function useCliProcess() {
  const agentUrl = useSettingsStore((s) => s.agentUrl);
  const agentToken = useSettingsStore((s) => s.agentToken);
  const agentWorkspacePath = useSettingsStore((s) => s.agentWorkspacePath);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceVolume = useSettingsStore((s) => s.voiceVolume);

  const voiceState = useVoiceStore((s) => s.state);
  const startSpeaking = useVoiceStore((s) => s.startSpeaking);
  const stopSpeaking = useVoiceStore((s) => s.stopSpeaking);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTerminalSession] = useState<string | null>(null);

  const activeTaskIdRef = useRef<string | null>(null);
  const activeStreamAbortRef = useRef<AbortController | null>(null);
  const currentAssistantTextRef = useRef<string>('');
  const lastSpokenAssistantTextRef = useRef<string>('');
  const lastSpokenConfirmationCallIdRef = useRef<string | null>(null);

  const { speak, stop } = useTts({
    onEnd: () => stopSpeaking(),
  });

  useEffect(() => {
    if (voiceState === 'LISTENING') {
      stop();
    }
  }, [voiceState, stop]);

  const setAssistantPendingConfirmation = useCallback(
    (pending: Message['pendingConfirmation'] | undefined) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== 'assistant') {
          return prev;
        }
        return [
          ...prev.slice(0, -1),
          { ...last, pendingConfirmation: pending },
        ];
      });
    },
    [],
  );

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

  const handleJsonRpc = useCallback(
    (event: JsonRpcResponse) => {
      if (event.error) {
        appendToAssistant(
          `\n[Agent error] ${event.error?.message ?? JSON.stringify(event.error)}\n`,
        );
        return;
      }
      const result = event.result;
      if (!result) {
        return;
      }

      if (result.kind === 'task' && typeof result.id === 'string') {
        activeTaskIdRef.current = result.id;
        return;
      }

      if (result.kind !== 'status-update') {
        return;
      }

      const coderKind = result.metadata?.coderAgent?.kind;

      if (coderKind === 'text-content') {
        const parts = result.status?.message?.parts ?? [];
        for (const part of parts) {
          if (part?.kind === 'text' && typeof part.text === 'string') {
            appendToAssistant(part.text);
          }
        }
      }

      if (coderKind === 'tool-call-confirmation') {
        const part = result.status?.message?.parts?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => p?.kind === 'data' && p.data,
        );
        const toolData = part?.data ?? {};
        const callId = toolData?.request?.callId ?? '';
        const toolName = toolData?.request?.name ?? toolData?.tool?.name ?? '';
        const args = toolData?.request?.args ?? {};
        const confirmationDetails = toolData?.confirmationDetails ?? {};
        const prompt =
          confirmationDetails?.prompt ??
          confirmationDetails?.command ??
          `Allow running tool "${toolName}"?`;
        const requiresPin = confirmationDetails?.requiresPin === true;
        const pinLength =
          typeof confirmationDetails?.pinLength === 'number'
            ? confirmationDetails.pinLength
            : undefined;
        const commandPreview =
          toolName && args
            ? `${toolName} ${JSON.stringify(args, null, 2)}`
            : toolName;

        setAssistantPendingConfirmation(
          callId
            ? {
                id: String(callId),
                description: String(prompt),
                command: String(commandPreview),
                riskLevel: 'moderate',
                requiresPin,
                pinLength,
              }
            : undefined,
        );

        if (
          voiceEnabled &&
          callId &&
          lastSpokenConfirmationCallIdRef.current !== String(callId)
        ) {
          lastSpokenConfirmationCallIdRef.current = String(callId);
          const spoken = deriveSpokenReply(String(prompt), 30);
          if (spoken) {
            const signal = startSpeaking();
            void speak(spoken, {
              signal,
              volume: Math.max(0, Math.min(1, voiceVolume / 100)),
            });
          }
        }
      }

      if (result.final === true) {
        setIsProcessing(false);
        activeStreamAbortRef.current = null;

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
      }
    },
    [
      appendToAssistant,
      setAssistantPendingConfirmation,
      speak,
      startSpeaking,
      voiceEnabled,
      voiceVolume,
    ],
  );

  const checkConnection = useCallback(async () => {
    const baseUrl = normalizeBaseUrl(agentUrl);
    if (!baseUrl) {
      setIsConnected(false);
      return;
    }
    try {
      const health = await fetch(`${baseUrl}/healthz`, { method: 'GET' });
      if (!health.ok) {
        setIsConnected(false);
        return;
      }
      if (!agentToken.trim()) {
        setIsConnected(true);
        return;
      }
      const whoami = await fetch(`${baseUrl}/whoami`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${agentToken.trim()}` },
      });
      setIsConnected(whoami.ok);
    } catch {
      setIsConnected(false);
    }
  }, [agentToken, agentUrl]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  const sendMessage = useCallback(
    async (text: string) => {
      const baseUrl = normalizeBaseUrl(agentUrl);
      const token = agentToken.trim();
      if (!baseUrl || !token) {
        setIsConnected(false);
        appendToAssistant(
          '\n[Not connected] Set Agent URL + Token in Settings.\n',
        );
        return;
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        events: [],
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);
      startAssistantMessage();
      setAssistantPendingConfirmation(undefined);

      activeStreamAbortRef.current?.abort();
      const abortController = new AbortController();
      activeStreamAbortRef.current = abortController;

      const taskId = activeTaskIdRef.current ?? undefined;
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
          metadata: {
            coderAgent: {
              kind: 'agent-settings',
              workspacePath: agentWorkspacePath || '/tmp',
            },
          },
          ...(taskId ? { taskId } : {}),
        },
      };

      const bodyString = JSON.stringify(body);
      const signedHeaders = await buildSignedHeaders({
        token,
        method: 'POST',
        pathWithQuery: '/',
        bodyString,
      });

      const res = await fetch(`${baseUrl}/`, {
        method: 'POST',
        headers: {
          ...signedHeaders,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: bodyString,
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        setIsProcessing(false);
        appendToAssistant(
          `\n[Agent request failed] ${res.status} ${res.statusText}\n`,
        );
        return;
      }

      await readSseStream(res.body, (msg) => {
        try {
          const parsed = JSON.parse(msg.data) as JsonRpcResponse;
          handleJsonRpc(parsed);
        } catch {
          // ignore
        }
      });
    },
    [
      agentToken,
      agentUrl,
      agentWorkspacePath,
      appendToAssistant,
      handleJsonRpc,
      setAssistantPendingConfirmation,
      startAssistantMessage,
    ],
  );

  const respondToConfirmation = useCallback(
    async (callId: string, approved: boolean, pin?: string) => {
      const baseUrl = normalizeBaseUrl(agentUrl);
      const token = agentToken.trim();
      const taskId = activeTaskIdRef.current;
      if (!baseUrl || !token || !taskId) {
        setAssistantPendingConfirmation(undefined);
        return;
      }

      setAssistantPendingConfirmation(undefined);
      setIsProcessing(true);
      startAssistantMessage();

      activeStreamAbortRef.current?.abort();
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
                  callId,
                  outcome: approved ? 'proceed_once' : 'cancel',
                  ...(pin ? { pin } : {}),
                },
              },
            ],
            messageId: crypto.randomUUID(),
          },
          metadata: {
            coderAgent: {
              kind: 'agent-settings',
              workspacePath: agentWorkspacePath || '/tmp',
            },
          },
          taskId,
        },
      };

      const bodyString = JSON.stringify(body);
      const signedHeaders = await buildSignedHeaders({
        token,
        method: 'POST',
        pathWithQuery: '/',
        bodyString,
      });

      const res = await fetch(`${baseUrl}/`, {
        method: 'POST',
        headers: {
          ...signedHeaders,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: bodyString,
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        setIsProcessing(false);
        appendToAssistant(
          `\n[Agent request failed] ${res.status} ${res.statusText}\n`,
        );
        return;
      }

      await readSseStream(res.body, (msg) => {
        try {
          const parsed = JSON.parse(msg.data) as JsonRpcResponse;
          handleJsonRpc(parsed);
        } catch {
          // ignore
        }
      });
    },
    [
      agentToken,
      agentUrl,
      agentWorkspacePath,
      appendToAssistant,
      handleJsonRpc,
      setAssistantPendingConfirmation,
      startAssistantMessage,
    ],
  );

  const closeTerminal = useCallback(async () => {
    // Desktop terminal sessions are currently only supported for local PTYs.
    // When using A2A (local or remote), we keep this as a no-op for now.
  }, []);

  return {
    messages,
    isConnected,
    isProcessing,
    activeTerminalSession,
    sendMessage,
    respondToConfirmation,
    closeTerminal,
  };
}
