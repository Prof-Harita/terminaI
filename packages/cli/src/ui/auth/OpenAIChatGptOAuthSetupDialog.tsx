/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildWizardSettingsPatch,
  ChatGptOAuthClient,
  ChatGptOAuthCredentialStorage,
  DEFAULT_CHATGPT_CODEX_BASE_URL,
  DEFAULT_OPENAI_OAUTH_REDIRECT_PORT,
  tryImportFromCodexCli,
  tryImportFromOpenCode,
  coreEvents,
  CoreEvent,
} from '@terminai/core';
import type { LoadedSettings } from '../../config/settings.js';
import { SettingScope } from '../../config/settings.js';
import { theme } from '../semantic-colors.js';
import { useTextBuffer } from '../components/shared/text-buffer.js';
import { TextInput } from '../components/shared/TextInput.js';
import { checkExhaustive } from '../../utils/checks.js';
import process from 'node:process';
import * as http from 'node:http';
import * as net from 'node:net';
import { URL } from 'node:url';
import { CliSpinner } from '../components/CliSpinner.js';
import open from 'open';

function isTruthyEnvVar(name: string): boolean {
  const raw = process.env[name];
  if (raw === undefined) return false;
  const normalized = raw.trim().toLowerCase();
  return (
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

const OAUTH_DEBUG = isTruthyEnvVar('TERMINAI_OAUTH_DEBUG');

type Step = 'model' | 'base_url' | 'oauth';

interface Props {
  settings: LoadedSettings;
  terminalWidth?: number;
  onBack: () => void;
  onComplete: () => void | Promise<void>;
  onAuthError: (error: string | null) => void;
}

export function OpenAIChatGptOAuthSetupDialog({
  settings,
  terminalWidth,
  onBack,
  onComplete,
  onAuthError,
}: Props) {
  const viewportWidth = Math.max(
    20,
    (terminalWidth ?? process.stdout.columns ?? 80) - 8,
  );

  const [step, setStep] = useState<Step>('model');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [codeVerifier, setCodeVerifier] = useState<string | null>(null);
  const [oauthInProgress, setOauthInProgress] = useState(false);
  const [callbackServerStatus, setCallbackServerStatus] = useState<
    'idle' | 'binding' | 'listening' | 'failed'
  >('idle');

  const serverRef = useRef<http.Server | null>(null);
  const oauthCallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const openaiSettings = settings.merged.llm?.openaiChatgptOauth;
  const defaultModel = openaiSettings?.model || '';
  const defaultBaseUrl =
    openaiSettings?.baseUrl || DEFAULT_CHATGPT_CODEX_BASE_URL;

  const modelBuffer = useTextBuffer({
    initialText: defaultModel,
    initialCursorOffset: defaultModel.length,
    viewport: { width: viewportWidth, height: 3 },
    isValidPath: () => false,
    inputFilter: (text) => text.replace(/[\r\n]/g, ''),
    singleLine: true,
  });

  const baseUrlBuffer = useTextBuffer({
    initialText: defaultBaseUrl,
    initialCursorOffset: defaultBaseUrl.length,
    viewport: { width: viewportWidth, height: 3 },
    isValidPath: () => false,
    inputFilter: (text) => text.replace(/[\r\n]/g, ''),
    singleLine: true,
  });

  const manualPasteBuffer = useTextBuffer({
    initialText: '',
    initialCursorOffset: 0,
    viewport: { width: viewportWidth, height: 3 },
    isValidPath: () => false,
    inputFilter: (text) => text.replace(/[\r\n]/g, ''),
    singleLine: true,
  });

  // Calculate target scope freshly on every render to avoid stale closure issues
  // if settings object is mutated but not replaced.
  const workspaceSettings = settings.forScope(SettingScope.Workspace).settings;
  const workspaceOpenai = workspaceSettings.llm?.openaiChatgptOauth;
  const hasWorkspaceOverride =
    workspaceSettings.llm?.provider !== undefined ||
    workspaceSettings.llm?.openaiCompatible !== undefined ||
    workspaceSettings.llm?.openaiChatgptOauth !== undefined ||
    !!workspaceOpenai?.baseUrl ||
    !!workspaceOpenai?.model ||
    !!workspaceOpenai?.internalModel;

  const targetScope = hasWorkspaceOverride
    ? SettingScope.Workspace
    : SettingScope.User;

  useEffect(
    () => () => {
      try {
        serverRef.current?.close();
      } catch {
        // ignore
      }
      serverRef.current = null;

      if (oauthCallbackTimeoutRef.current) {
        clearTimeout(oauthCallbackTimeoutRef.current);
      }
      oauthCallbackTimeoutRef.current = null;
    },
    [],
  );

  const startOauthFlow = useCallback(
    async (client: ChatGptOAuthClient): Promise<void> => {
      if (OAUTH_DEBUG) console.log('[OAuth DEBUG] startOauthFlow called');
      setCallbackServerStatus('binding');
      const redirectUri = `http://localhost:${DEFAULT_OPENAI_OAUTH_REDIRECT_PORT}/auth/callback`;
      const start = client.startAuthorization({ redirectUri });
      if (OAUTH_DEBUG)
        console.log('[OAuth DEBUG] Authorization started, state:', start.state);

      setAuthUrl(start.authUrl);
      setOauthState(start.state);
      setCodeVerifier(start.codeVerifier);
      setOauthInProgress(true);

      // Auto-open browser like Google OAuth does
      coreEvents.emit(CoreEvent.UserFeedback, {
        severity: 'info',
        message:
          `\nChatGPT OAuth login required.\n` +
          `Attempting to open authentication page in your browser.\n` +
          `Otherwise navigate to:\n${start.authUrl}\n`,
      });

      try {
        const childProcess = await open(start.authUrl);
        childProcess.on('error', (error) => {
          coreEvents.emit(CoreEvent.UserFeedback, {
            severity: 'warning',
            message: `Could not auto-open browser: ${error.message}. Please copy the URL above.`,
          });
        });
      } catch (_err) {
        // Browser auto-open failed, user can still copy the URL
        coreEvents.emit(CoreEvent.UserFeedback, {
          severity: 'warning',
          message: 'Could not auto-open browser. Please copy the URL above.',
        });
      }

      if (OAUTH_DEBUG)
        console.log(
          '[OAuth DEBUG] About to call bindOAuthServerWithCancelRetry',
        );
      try {
        const server = await bindOAuthServerWithCancelRetry({
          expectedState: start.state,
          onCode: async (code) => {
            if (OAUTH_DEBUG)
              console.log('[OAuth DEBUG] onCode callback triggered with code');
            if (oauthCallbackTimeoutRef.current) {
              clearTimeout(oauthCallbackTimeoutRef.current);
            }
            oauthCallbackTimeoutRef.current = null;

            const creds = await client.exchangeAuthorizationCode({
              code,
              redirectUri,
              codeVerifier: start.codeVerifier,
            });
            await ChatGptOAuthCredentialStorage.save(creds);
            coreEvents.emit(CoreEvent.UserFeedback, {
              severity: 'info',
              message: 'ChatGPT OAuth authentication succeeded!\n',
            });
            void onComplete();
          },
          onError: (e) => {
            if (OAUTH_DEBUG)
              console.log(
                '[OAuth DEBUG] onError callback triggered:',
                e.message,
              );
            onAuthError(e.message);
          },
        });
        if (OAUTH_DEBUG)
          console.log(
            '[OAuth DEBUG] bindOAuthServerWithCancelRetry returned, server:',
            !!server,
          );

        setCallbackServerStatus('listening');
        serverRef.current = server;

        if (oauthCallbackTimeoutRef.current) {
          clearTimeout(oauthCallbackTimeoutRef.current);
        }
        oauthCallbackTimeoutRef.current = setTimeout(
          () => {
            onAuthError(
              'Timed out waiting for OAuth callback. Paste the full redirect URL from your browser.',
            );
            setCallbackServerStatus('failed');
            try {
              server.close();
            } catch {
              // ignore
            }
          },
          2 * 60 * 1000,
        );

        server.once('close', () => {
          if (oauthCallbackTimeoutRef.current) {
            clearTimeout(oauthCallbackTimeoutRef.current);
          }
          oauthCallbackTimeoutRef.current = null;
        });
      } catch (e: unknown) {
        setCallbackServerStatus('failed');
        throw e;
      }
    },
    [onAuthError, onComplete],
  );

  const applyProviderSettings = useCallback((): boolean => {
    const model = modelBuffer.text.trim();
    if (!model) {
      onAuthError('Model is required.');
      setStep('model');
      return false;
    }

    const baseUrl = baseUrlBuffer.text.trim() || DEFAULT_CHATGPT_CODEX_BASE_URL;

    const patches = buildWizardSettingsPatch({
      provider: 'openai_chatgpt_oauth',
      openaiChatgptOauth: { model, baseUrl },
    });
    for (const patch of patches) {
      settings.setValue(targetScope, patch.path, patch.value);
    }
    return true;
  }, [
    baseUrlBuffer.text,
    modelBuffer.text,
    onAuthError,
    settings,
    targetScope,
  ]);

  const onSubmit = async () => {
    switch (step) {
      case 'model':
        onAuthError(null);
        setStep('base_url');
        return;
      case 'base_url': {
        onAuthError(null);
        if (!applyProviderSettings()) return;

        try {
          const client = new ChatGptOAuthClient();
          const imported =
            (await tryImportFromCodexCli(client)) ??
            (await tryImportFromOpenCode(client));

          // Ensure imported credentials strictly have the required account ID
          if (imported && imported.accountId) {
            await ChatGptOAuthCredentialStorage.save(imported);
            void onComplete();
            return;
          }
        } catch (e: unknown) {
          // Log but continue to OAuth flow - import is optional
          const msg = e instanceof Error ? e.message : String(e);
          coreEvents.emit(CoreEvent.UserFeedback, {
            severity: 'warning',
            message: `Could not import existing credentials: ${msg}`,
          });
        }

        setStep('oauth');
        return;
      }
      case 'oauth': {
        // Manual paste submit
        onAuthError(null);
        try {
          const redirectUrl = manualPasteBuffer.text.trim();
          const parsed = parseRedirectUrl(redirectUrl);
          if (!parsed) {
            onAuthError(
              'Could not parse redirect URL. Paste the full URL from your browser.',
            );
            return;
          }
          if (!oauthState || parsed.state !== oauthState) {
            onAuthError(
              'State mismatch. Restart the OAuth flow and try again.',
            );
            return;
          }
          if (!codeVerifier) {
            onAuthError('OAuth state is missing. Restart the OAuth flow.');
            return;
          }

          const redirectUri = `http://localhost:${DEFAULT_OPENAI_OAUTH_REDIRECT_PORT}/auth/callback`;
          const client = new ChatGptOAuthClient();
          const creds = await client.exchangeAuthorizationCode({
            code: parsed.code,
            redirectUri,
            codeVerifier,
          });
          await ChatGptOAuthCredentialStorage.save(creds);
          void onComplete();
          return;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          onAuthError(msg);
          return;
        }
      }
      default:
        checkExhaustive(step);
    }
  };

  useEffect(() => {
    if (step !== 'oauth' || oauthInProgress) return;

    if (!applyProviderSettings()) return;

    const client = new ChatGptOAuthClient();
    void startOauthFlow(client).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Failed to start OAuth flow';
      onAuthError(msg);
    });
  }, [
    applyProviderSettings,
    oauthInProgress,
    onAuthError,
    startOauthFlow,
    step,
  ]);

  const title = 'ChatGPT OAuth setup';

  const description = (() => {
    switch (step) {
      case 'model':
        return 'Enter the model ID (e.g. gpt-5.2-codex).';
      case 'base_url':
        return 'Optional: override the Codex base URL (default is chatgpt.com).';
      case 'oauth':
        return authUrl
          ? 'Open the URL below in your browser to sign in. If you cannot use the local callback, paste the final redirect URL here.'
          : 'Starting OAuth...';
      default:
        checkExhaustive(step);
        return '';
    }
  })();

  const buffer =
    step === 'model'
      ? modelBuffer
      : step === 'base_url'
        ? baseUrlBuffer
        : manualPasteBuffer;

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.focused}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold color={theme.text.primary}>
        {title}
      </Text>
      <Box marginTop={1}>
        <Text color={theme.text.primary}>{description}</Text>
      </Box>

      {step === 'oauth' && authUrl && (
        <Box marginTop={1} flexDirection="column" width="100%">
          <Text color={theme.text.secondary}>
            If browser didn&apos;t open, copy this URL:
          </Text>
          <Box marginTop={1} width="100%">
            <Text color={theme.text.link} wrap="wrap">
              {authUrl}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.text.secondary}>
              {callbackServerStatus === 'failed' ? null : (
                <CliSpinner type="dots" />
              )}{' '}
              {callbackServerStatus === 'listening'
                ? 'Waiting for OAuth callback on '
                : callbackServerStatus === 'failed'
                  ? 'Local callback server unavailable. Paste the full redirect URL below.'
                  : 'Starting local callback server on '}
              {callbackServerStatus === 'failed'
                ? null
                : `localhost:${DEFAULT_OPENAI_OAUTH_REDIRECT_PORT}`}
            </Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Box
          borderStyle="round"
          borderColor={theme.border.default}
          paddingX={1}
          flexGrow={1}
        >
          <TextInput buffer={buffer} onSubmit={onSubmit} onCancel={onBack} />
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          (Press Enter to continue, Esc to go back)
        </Text>
        <Text color={theme.text.secondary}>
          Saving config scope:{' '}
          {targetScope === SettingScope.Workspace ? 'workspace' : 'user'}
        </Text>
      </Box>
    </Box>
  );
}

function parseRedirectUrl(
  urlText: string,
): { code: string; state: string } | null {
  try {
    const url = new URL(urlText);
    const code = url.searchParams.get('code') ?? '';
    const state = url.searchParams.get('state') ?? '';
    if (!code || !state) return null;
    return { code, state };
  } catch {
    return null;
  }
}

async function bindOAuthServerWithCancelRetry(input: {
  expectedState: string;
  onCode: (code: string) => Promise<void>;
  onError: (error: Error) => void;
}): Promise<http.Server> {
  const port = DEFAULT_OPENAI_OAUTH_REDIRECT_PORT;
  // Use 127.0.0.1 by default instead of 'localhost' to avoid IPv4/IPv6
  // mismatch on Windows. The redirect URI uses 'localhost' (required by OAuth),
  // but binding to 127.0.0.1 ensures the server listens on IPv4.
  // Allow override via OAUTH_CALLBACK_HOST for Docker/special environments.
  const host = process.env['OAUTH_CALLBACK_HOST'] || '127.0.0.1';

  if (OAUTH_DEBUG)
    console.log('[OAuth DEBUG] Creating callback server for', host, port);

  const server = http.createServer((req, res) => {
    if (OAUTH_DEBUG)
      console.log('[OAuth DEBUG] Received request:', req.method, req.url);
    try {
      const url = new URL(req.url ?? '/', `http://${host}:${port}`);
      if (url.pathname === '/cancel') {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          Connection: 'close',
        });
        res.end('cancelled', () => {
          req.socket.destroy();
        });
        try {
          server.close();
        } catch {
          // ignore
        }
        return;
      }

      if (url.pathname !== '/auth/callback') {
        res.writeHead(404, {
          'Content-Type': 'text/plain',
          Connection: 'close',
        });
        res.end('not found', () => {
          req.socket.destroy();
        });
        return;
      }

      const code = url.searchParams.get('code') ?? '';
      const state = url.searchParams.get('state') ?? '';
      if (!code || !state) {
        res.writeHead(400, {
          'Content-Type': 'text/plain',
          Connection: 'close',
        });
        res.end('missing code/state', () => {
          req.socket.destroy();
        });
        return;
      }
      if (state !== input.expectedState) {
        res.writeHead(400, {
          'Content-Type': 'text/plain',
          Connection: 'close',
        });
        res.end('state mismatch', () => {
          req.socket.destroy();
        });
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/html',
        Connection: 'close',
      });
      res.end(
        '<!doctype html><meta charset="utf-8"><title>TerminaI</title><p>Authentication complete. You can close this tab.</p>',
        () => {
          req.socket.destroy();
        },
      );

      try {
        server.close();
      } catch {
        // ignore
      }

      void input.onCode(code).catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error('OAuth exchange failed');
        input.onError(err);
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('OAuth callback failed');
      input.onError(err);
      res.writeHead(500, {
        'Content-Type': 'text/plain',
        Connection: 'close',
      });
      res.end('error', () => {
        req.socket.destroy();
      });
      try {
        server.close();
      } catch {
        // ignore
      }
    }
  });

  await listenWithCancelRetry(server, { host, port });
  return server;
}

async function listenWithCancelRetry(
  server: http.Server,
  input: { host: string; port: number },
): Promise<void> {
  const attempts = 10;
  const delayMs = 200;
  const listenTimeoutMs = 2_000;

  for (let i = 0; i < attempts; i++) {
    if (OAUTH_DEBUG)
      console.log(
        `[OAuth DEBUG] Bind attempt ${i + 1}/${attempts} to ${input.host}:${input.port}`,
      );
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          server.off('error', onError);
          try {
            server.close();
          } catch {
            // ignore
          }
          reject(
            new Error(
              `Timed out while binding ${input.host}:${input.port} (attempt ${i + 1}/${attempts})`,
            ),
          );
        }, listenTimeoutMs);

        const onError = (err: unknown) => {
          if (OAUTH_DEBUG)
            console.log('[OAuth DEBUG] Server error during bind:', err);
          server.off('error', onError);
          clearTimeout(timer);
          reject(err);
        };
        server.once('error', onError);
        server.listen(input.port, input.host, () => {
          if (OAUTH_DEBUG)
            console.log(
              `[OAuth DEBUG] Server successfully listening on ${input.host}:${input.port}`,
            );
          server.off('error', onError);
          clearTimeout(timer);
          resolve();
        });
      });
      return;
    } catch (e: unknown) {
      const code =
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        typeof (e as { code?: unknown }).code === 'string'
          ? (e as { code: string }).code
          : '';
      if (OAUTH_DEBUG)
        console.log(`[OAuth DEBUG] Bind failed with code: ${code}`, e);
      if (code !== 'EADDRINUSE') {
        if (OAUTH_DEBUG)
          console.log('[OAuth DEBUG] Non-EADDRINUSE error, throwing');
        throw e;
      }
      if (OAUTH_DEBUG)
        console.log('[OAuth DEBUG] Port in use, sending cancel request');
      await sendCancelRequest({ host: input.host, port: input.port }).catch(
        () => {},
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw new Error(`Failed to bind ${input.host}:${input.port}`);
}

async function sendCancelRequest(input: {
  host: string;
  port: number;
}): Promise<void> {
  const host = input.host === '0.0.0.0' ? '127.0.0.1' : input.host;
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    const socket = net.connect({ host, port: input.port });
    socket.setTimeout(2_000);

    socket.on('timeout', () => {
      socket.destroy();
      settle(new Error('Cancel request timed out'));
    });
    socket.on('error', (error) => {
      socket.destroy();
      settle(error);
    });
    socket.on('connect', () => {
      socket.write(`GET /cancel HTTP/1.1\r\n`);
      socket.write(`Host: ${host}:${input.port}\r\n`);
      socket.write(`Connection: close\r\n\r\n`);
    });
    socket.on('close', () => {
      settle();
    });
  });
}
