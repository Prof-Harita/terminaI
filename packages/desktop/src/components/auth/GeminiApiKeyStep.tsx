/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import type { AuthClient } from '../../utils/authClient';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface Props {
  client: AuthClient;
  onDone: () => void;
  onError: (message: string | null) => void;
}

export function GeminiApiKeyStep({ client, onDone, onError }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      onError('API key cannot be empty');
      return;
    }

    onError(null);
    setIsSubmitting(true);
    try {
      const status = await client.setApiKey(trimmed);
      if (status.status === 'ok') {
        setApiKey('');
        // 3.4 Fix: Switch server provider to Gemini before updating local state
        await client.switchProvider({ provider: 'gemini' }).catch(() => {
          // Server may already be on Gemini, ignore errors
        });
        useSettingsStore.getState().setProvider('gemini');
        onDone();
        return;
      }
      onError(status.message ?? 'API key was not accepted');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to submit API key');
    } finally {
      setIsSubmitting(false);
    }
  }, [apiKey, client, onDone, onError]);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        Paste your Gemini API key. It is sent to the sidecar and stored securely
        server-side (not in Desktop local storage).
      </p>

      <Input
        type="password"
        placeholder="AIzaSy..."
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />

      <div className="flex gap-2">
        <Button onClick={() => void submit()} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save API key'}
        </Button>
      </div>
    </div>
  );
}
