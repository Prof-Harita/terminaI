/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIChatGptOAuthSetupDialog } from './OpenAIChatGptOAuthSetupDialog.js';
import { renderWithProviders } from '../../test-utils/render.js';
import {
  coreEvents,
  openBrowserSecurely,
  shouldLaunchBrowser,
} from '@terminai/core';
import { act } from 'react';

// Mock core utilities
vi.mock('@terminai/core', async () => {
  const actual = await vi.importActual('@terminai/core');
  return {
    ...actual,
    coreEvents: {
      emitFeedback: vi.fn(),
      emit: vi.fn(),
    },
    openBrowserSecurely: vi.fn().mockResolvedValue(undefined),
    shouldLaunchBrowser: vi.fn().mockReturnValue(true),
    ChatGptOAuthClient: vi.fn().mockImplementation(() => ({
      startAuthorization: vi.fn().mockReturnValue({
        authUrl: 'https://auth.openai.com/authorize?test=1',
        state: 'test-state',
        codeVerifier: 'test-verifier',
      }),
      exchangeAuthorizationCode: vi.fn().mockResolvedValue({
        token: { accessToken: 'test-token', refreshToken: 'test-refresh' },
        accountId: 'test-account',
      }),
    })),
    ChatGptOAuthCredentialStorage: {
      save: vi.fn().mockResolvedValue(undefined),
    },
    tryImportFromCodexCli: vi.fn().mockResolvedValue(null),
    tryImportFromOpenCode: vi.fn().mockResolvedValue(null),
  };
});

describe('OpenAIChatGptOAuthSetupDialog', () => {
  const mockSettings = {
    merged: {
      llm: {
        openaiChatgptOauth: {
          model: 'gpt-5.2-codex',
          baseUrl: 'https://chatgpt.com',
        },
      },
    },
    setValue: vi.fn(),
    forScope: vi.fn(() => ({ settings: {} })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses emitFeedback for user notifications', async () => {
    const onComplete = vi.fn();
    const onAuthError = vi.fn();

    const { stdin } = renderWithProviders(
      <OpenAIChatGptOAuthSetupDialog
        settings={mockSettings}
        onBack={() => {}}
        onComplete={onComplete}
        onAuthError={onAuthError}
      />,
    );

    // Step 1: Model (gpt-5.2-codex is default)
    await act(async () => {
      stdin.write('\r');
    });

    // Step 2: Base URL (default is chatgpt.com)
    await act(async () => {
      stdin.write('\r');
    });

    // Step 3: OAuth starts automatically via useEffect
    // We need to wait for the effect to fire
    await vi.waitFor(() => {
      expect(coreEvents.emitFeedback).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('ChatGPT OAuth login required'),
      );
    });
  });

  it('respects shouldLaunchBrowser(false) for headless environments', async () => {
    vi.mocked(shouldLaunchBrowser).mockReturnValue(false);

    const { stdin } = renderWithProviders(
      <OpenAIChatGptOAuthSetupDialog
        settings={mockSettings}
        onBack={() => {}}
        onComplete={() => {}}
        onAuthError={() => {}}
      />,
    );

    await act(async () => {
      stdin.write('\r'); // transition from model to base_url
    });
    await act(async () => {
      stdin.write('\r'); // transition from base_url to oauth
    });

    await vi.waitFor(() => {
      expect(coreEvents.emitFeedback).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('Please sign in via your browser'),
      );
    });

    expect(openBrowserSecurely).not.toHaveBeenCalled();
  });

  it('applies a timeout to the browser launch', async () => {
    vi.useFakeTimers();
    vi.mocked(shouldLaunchBrowser).mockReturnValue(true);

    // Mock openBrowserSecurely to never resolve
    vi.mocked(openBrowserSecurely).mockReturnValue(new Promise(() => {}));

    const { stdin } = renderWithProviders(
      <OpenAIChatGptOAuthSetupDialog
        settings={mockSettings}
        onBack={() => {}}
        onComplete={() => {}}
        onAuthError={() => {}}
      />,
    );

    await act(async () => {
      stdin.write('\r'); // model
    });
    await act(async () => {
      stdin.write('\r'); // base_url
    });

    await vi.waitFor(() => {
      expect(openBrowserSecurely).toHaveBeenCalled();
    });

    // Fast-forward 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // No errors should be thrown, and flow continues
  });
});
