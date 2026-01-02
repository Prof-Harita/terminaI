/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { AuthClient } from '../../utils/authClient';
import { Button } from '../ui/button';

interface Props {
  client: AuthClient;
  onDone: () => void;
  onCancel: () => void;
  onError: (message: string | null) => void;
}

export function GeminiOAuthStep({ client, onDone, onCancel, onError }: Props) {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollOnce = useCallback(async () => {
    try {
      const status = await client.getStatus();
      if (status.status === 'ok') {
        stopPolling();
        onDone();
        return;
      }
      if (status.status === 'error') {
        stopPolling();
        onError(status.message ?? 'OAuth failed');
        return;
      }
      // If the flow ends without producing creds, we treat it as not completed.
      if (status.status === 'required' && isPolling) {
        stopPolling();
        onError(status.message ?? 'OAuth did not complete');
      }
    } catch {
      // Ignore transient polling errors.
    }
  }, [client, isPolling, onDone, onError, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setIsPolling(true);
    intervalRef.current = window.setInterval(() => {
      void pollOnce();
    }, 1000);
  }, [pollOnce, stopPolling]);

  const startOAuth = useCallback(async () => {
    onError(null);
    setIsStarting(true);
    try {
      const res = await client.startOAuth();
      setAuthUrl(res.authUrl);
      try {
        await openUrl(res.authUrl);
      } catch {
        window.open(res.authUrl, '_blank');
      }
      startPolling();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to start OAuth';
      // If OAuth is already in progress, just start polling.
      if (message.includes('(409)') || message.includes(' 409')) {
        startPolling();
        return;
      }
      onError(message);
    } finally {
      setIsStarting(false);
    }
  }, [client, onError, startPolling]);

  const cancelOAuth = useCallback(async () => {
    stopPolling();
    try {
      await client.cancelOAuth();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to cancel OAuth');
    } finally {
      setAuthUrl(null);
      onCancel();
    }
  }, [client, onCancel, onError, stopPolling]);

  useEffect(() => {
    // If the backend reports in-progress, start polling immediately so a user
    // who reopened the wizard can still complete the flow.
    void client
      .getStatus()
      .then((s) => {
        if (s.status === 'in_progress') {
          startPolling();
        }
      })
      .catch(() => {
        // ignore
      });

    return () => {
      stopPolling();
    };
  }, [client, startPolling, stopPolling]);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        We’ll open a browser window to sign in. After you finish, this wizard
        will automatically continue.
      </p>

      <div className="flex gap-2">
        <Button onClick={() => void startOAuth()} disabled={isStarting}>
          {isStarting ? 'Opening…' : 'Open browser'}
        </Button>
        <Button variant="secondary" onClick={() => void cancelOAuth()}>
          Cancel
        </Button>
      </div>

      {isPolling && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Waiting for sign-in…</span>
        </div>
      )}

      {authUrl && (
        <div className="text-xs text-muted-foreground">
          If the browser didn’t open, use this link:{' '}
          <a
            href={authUrl}
            className="underline"
            onClick={(e) => {
              e.preventDefault();
              void openUrl(authUrl).catch(() => window.open(authUrl, '_blank'));
            }}
          >
            {authUrl}
          </a>
        </div>
      )}
    </div>
  );
}
