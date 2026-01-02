/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { AuthClient } from '../utils/authClient';
import { Button } from './ui/button';
import { GeminiOAuthStep } from './auth/GeminiOAuthStep';
import { GeminiApiKeyStep } from './auth/GeminiApiKeyStep';
import { GeminiVertexStep } from './auth/GeminiVertexStep';

interface Props {
  status: 'unknown' | 'ok' | 'required' | 'in_progress' | 'error';
  message: string | null;
  onComplete: () => void;
}

type WizardStep = 'choose' | 'oauth' | 'api_key' | 'vertex';

export function AuthWizard({ status, message, onComplete }: Props) {
  const agentUrl = useSettingsStore((s) => s.agentUrl);
  const agentToken = useSettingsStore((s) => s.agentToken);

  const client = useMemo(() => {
    return new AuthClient(agentUrl, agentToken);
  }, [agentToken, agentUrl]);

  const [step, setStep] = useState<WizardStep>(
    status === 'in_progress' ? 'oauth' : 'choose',
  );
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

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[640px] max-w-[90vw] bg-card border border-border rounded-lg shadow-lg flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Model authentication required</h2>
          {step !== 'choose' && (
            <Button variant="ghost" size="sm" onClick={() => setStep('choose')}>
              Back
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

          {step === 'choose' && (
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
              onCancel={() => setStep('choose')}
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
        </div>
      </div>
    </div>
  );
}
