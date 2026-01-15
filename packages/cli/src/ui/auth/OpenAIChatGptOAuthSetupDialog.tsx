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
import { URL } from 'node:url';
import { CliSpinner } from '../components/CliSpinner.js';
import open from 'open';

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

  const serverRef = useRef<http.Server | null>(null);

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
    },
    [],
  );

  const startOauthFlow = useCallback(
    async (client: ChatGptOAuthClient): Promise<void> => {
      const redirectUri = `http://localhost:${DEFAULT_OPENAI_OAUTH_REDIRECT_PORT}/auth/callback`;
      const start = client.startAuthorization({ redirectUri });

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

      const server = await bindOAuthServerWithCancelRetry({
        expectedState: start.state,
        onCode: async (code) => {
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
          onAuthError(e.message);
        },
      });

      serverRef.current = server;
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

        setStep('oauth');
        return;
      }
      case 'oauth': {
        // Manual paste submit
        onAuthError(null);
        const redirectUrl = manualPasteBuffer.text.trim();
        const parsed = parseRedirectUrl(redirectUrl);
        if (!parsed) {
          onAuthError(
            'Could not parse redirect URL. Paste the full URL from your browser.',
          );
          return;
        }
        if (!oauthState || parsed.state !== oauthState) {
          onAuthError('State mismatch. Restart the OAuth flow and try again.');
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
              <CliSpinner type="dots" /> Waiting for OAuth callback on{' '}
              {`localhost:${DEFAULT_OPENAI_OAUTH_REDIRECT_PORT}`}
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
  const host = 'localhost';

  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${host}:${port}`);
      if (url.pathname === '/cancel') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('cancelled');
        try {
          server.close();
        } catch {
          // ignore
        }
        return;
      }

      if (url.pathname !== '/auth/callback') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }

      const code = url.searchParams.get('code') ?? '';
      const state = url.searchParams.get('state') ?? '';
      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('missing code/state');
        return;
      }
      if (state !== input.expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('state mismatch');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<!doctype html><meta charset="utf-8"><title>TerminaI</title><p>Authentication complete. You can close this tab.</p>',
      );

      void input.onCode(code).catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error('OAuth exchange failed');
        input.onError(err);
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('OAuth callback failed');
      input.onError(err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('error');
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

  for (let i = 0; i < attempts; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (err: unknown) => {
          server.off('error', onError);
          reject(err);
        };
        server.once('error', onError);
        server.listen(input.port, input.host, () => {
          server.off('error', onError);
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
      if (code !== 'EADDRINUSE') {
        throw e;
      }
      await fetch(`http://${input.host}:${input.port}/cancel`).catch(() => {});
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw new Error(`Failed to bind ${input.host}:${input.port}`);
}
