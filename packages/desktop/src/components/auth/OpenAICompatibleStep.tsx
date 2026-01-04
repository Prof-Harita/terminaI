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
  initialValues?: {
    baseUrl?: string;
    model?: string;
    envVarName?: string;
  };
}

export function OpenAICompatibleStep({
  client,
  onDone,
  onError,
  initialValues,
}: Props) {
  // 4.2 Fix: Provide sane defaults for newbie flow
  const [baseUrl, setBaseUrl] = useState(
    initialValues?.baseUrl ?? 'http://localhost:11434/v1',
  );
  const [model, setModel] = useState(initialValues?.model ?? '');
  const [envVarName, setEnvVarName] = useState(
    initialValues?.envVarName ?? 'OPENAI_API_KEY',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!baseUrl.trim() || !model.trim()) {
      onError('Base URL and Model are required');
      return;
    }

    onError(null);
    setIsSubmitting(true);
    try {
      const status = await client.switchProvider({
        provider: 'openai_compatible',
        openaiCompatible: {
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          envVarName: envVarName.trim() || undefined,
        },
      });

      if (status.status === 'ok' || status.status === 'required') {
        useSettingsStore.getState().setProvider('openai_compatible');
        useSettingsStore.getState().setOpenAIConfig({
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          envVarName: envVarName.trim() || undefined,
        });
        onDone();
        return;
      }
      onError(status.message ?? 'Failed to switch provider');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to switch provider');
    } finally {
      setIsSubmitting(false);
    }
  }, [baseUrl, model, envVarName, client, onDone, onError]);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        Configure an OpenAI-compatible provider (e.g. LocalAI, vLLM, or OpenAI).
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Base URL</label>
        <Input
          placeholder="http://localhost:8080/v1"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Model Name</label>
        <Input
          placeholder="gpt-4"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Environment Variable (for API Key)
        </label>
        <Input
          placeholder="OPENAI_API_KEY"
          value={envVarName}
          onChange={(e) => setEnvVarName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The name of the environment variable on the server that contains the
          API key.
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={() => void submit()} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
