/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { createAuthClient } from '../utils/authClient';
import { Button } from './ui/button';
import { GeminiOAuthStep } from './auth/GeminiOAuthStep';
import { GeminiApiKeyStep } from './auth/GeminiApiKeyStep';
import { GeminiVertexStep } from './auth/GeminiVertexStep';
import { OpenAICompatibleStep } from './auth/OpenAICompatibleStep';

interface Props {
  status: 'unknown' | 'ok' | 'required' | 'in_progress' | 'error';
  message: string | null;
  onComplete: () => void;
  mode?: 'auth_required' | 'switch_provider'; // Default: auth_required
  initialOpenAIValues?: {
    baseUrl?: string;
    model?: string;
    envVarName?: string;
  };
}

type WizardStep =
  | 'select_provider'
  | 'choose_gemini_method'
  | 'oauth'
  | 'api_key'
  | 'vertex'
  | 'openai_config';

export function AuthWizard({
  status,
  message,
  onComplete,
  mode = 'auth_required',
  initialOpenAIValues,
}: Props) {
  const agentUrl = useSettingsStore((s) => s.agentUrl);
  const agentToken = useSettingsStore((s) => s.agentToken);

  const client = useMemo(
    () => createAuthClient(agentUrl, agentToken),
    [agentToken, agentUrl],
  );

  // If in_progress, assume OAuth flow. If switch_provider, start at select_provider.
  // If auth_required, default to select_provider to allow switching, or maybe choose_gemini_method if we assume Gemini default?
  // Spec says: "Step 1: provider selection". So let's default to select_provider.
  const [step, setStep] = useState<WizardStep>(() => {
    if (status === 'in_progress') return 'oauth';
    return 'select_provider';
  });

  const [localError, setLocalError] = useState<string | null>(null);

  if (!agentToken) {
    return null;
  }

  // Status may be "unknown" briefly while App checks /auth/status.
  if (status === 'unknown') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Verifying model authentication…</span>
        </div>
      </div>
    );
  }

  const title =
    mode === 'switch_provider'
      ? 'Switch Model Provider'
      : 'Model Authentication Required';

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[640px] max-w-[90vw] bg-card border border-border rounded-lg shadow-lg flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">{title}</h2>
          {step !== 'select_provider' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  step === 'choose_gemini_method' ||
                  step === 'openai_config'
                ) {
                  setStep('select_provider');
                } else {
                  // Back from gemini sub-methods goes to gemini method chooser
                  setStep('choose_gemini_method');
                }
              }}
            >
              Back
            </Button>
          )}
          {step === 'select_provider' && mode === 'switch_provider' && (
            <Button variant="ghost" size="sm" onClick={onComplete}>
              Cancel
            </Button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {(message || localError) && (
            <div className="text-sm border rounded p-3">
              <div className="font-medium mb-1">
                {status === 'error' ? 'Error' : 'Status'}
              </div>
              <div className="text-muted-foreground">
                {localError ?? message}
              </div>
            </div>
          )}

          {step === 'select_provider' && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Select the AI model provider you want to use:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="justify-start h-12"
                  onClick={() => {
                    setLocalError(null);
                    setStep('choose_gemini_method');
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Google Gemini</span>
                    <span className="text-xs text-muted-foreground">
                      Use Gemini 1.5 Pro/Flash via Google Cloud or AI Studio
                    </span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-12"
                  onClick={() => {
                    setLocalError(null);
                    setStep('openai_config');
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">OpenAI Compatible</span>
                    <span className="text-xs text-muted-foreground">
                      Connect to LocalAI, vLLM, or other OpenAI-compatible APIs
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {step === 'choose_gemini_method' && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Choose how you want to authenticate Gemini:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="justify-start h-12"
                  onClick={() => {
                    setLocalError(null);
                    setStep('oauth');
                  }}
                >
                  Sign in with Google (OAuth)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-12"
                  onClick={() => {
                    setLocalError(null);
                    setStep('api_key');
                  }}
                >
                  Use a Gemini API key
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-12"
                  onClick={() => {
                    setLocalError(null);
                    setStep('vertex');
                  }}
                >
                  Use Vertex AI (ADC / env)
                </Button>
              </div>
            </div>
          )}

          {step === 'oauth' && (
            <GeminiOAuthStep
              client={client}
              onDone={onComplete}
              onCancel={() => setStep('choose_gemini_method')}
              onError={setLocalError}
            />
          )}

          {step === 'api_key' && (
            <GeminiApiKeyStep
              client={client}
              onDone={onComplete}
              onError={setLocalError}
            />
          )}

          {step === 'vertex' && (
            <GeminiVertexStep
              client={client}
              onDone={onComplete}
              onError={setLocalError}
            />
          )}

          {step === 'openai_config' && (
            <OpenAICompatibleStep
              client={client}
              onDone={onComplete}
              onError={setLocalError}
              initialValues={initialOpenAIValues}
            />
          )}
        </div>
      </div>
    </div>
  );
}
