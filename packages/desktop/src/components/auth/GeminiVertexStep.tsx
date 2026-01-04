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

interface Props {
  client: AuthClient;
  onDone: () => void;
  onError: (message: string | null) => void;
}

export function GeminiVertexStep({ client, onDone, onError }: Props) {
  const [isChecking, setIsChecking] = useState(false);

  const recheck = useCallback(async () => {
    onError(null);
    setIsChecking(true);
    try {
      const status = await client.useGeminiVertex();
      if (status.status === 'ok') {
        // 3.4 Fix: Switch server provider to Gemini before updating local state
        await client.switchProvider({ provider: 'gemini' }).catch(() => {
          // Server may already be on Gemini, ignore errors
        });
        useSettingsStore.getState().setProvider('gemini');
        onDone();
        return;
      }
      onError(
        status.message ??
          'Vertex AI is not configured. Set env vars for the sidecar process and try again.',
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to check Vertex AI');
    } finally {
      setIsChecking(false);
    }
  }, [client, onDone, onError]);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        Vertex AI uses your machine credentials (ADC) and environment variables.
        These must be configured for the sidecar process.
      </p>
      <div className="text-sm border rounded p-3 space-y-2">
        <div className="font-medium">Required</div>
        <ul className="list-disc pl-5 text-muted-foreground">
          <li>
            <code>GOOGLE_CLOUD_PROJECT</code> and{' '}
            <code>GOOGLE_CLOUD_LOCATION</code>
          </li>
          <li>
            Or <code>GOOGLE_API_KEY</code> for express mode
          </li>
        </ul>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => void recheck()} disabled={isChecking}>
          {isChecking ? 'Checking…' : 'Re-check'}
        </Button>
      </div>
    </div>
  );
}
