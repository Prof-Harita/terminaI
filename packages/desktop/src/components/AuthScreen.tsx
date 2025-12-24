/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

interface Props {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: Props) {
  const agentUrl = useSettingsStore((s) => s.agentUrl);
  const setAgentUrl = useSettingsStore((s) => s.setAgentUrl);
  const agentToken = useSettingsStore((s) => s.agentToken);
  const setAgentToken = useSettingsStore((s) => s.setAgentToken);
  const agentWorkspacePath = useSettingsStore((s) => s.agentWorkspacePath);
  const setAgentWorkspacePath = useSettingsStore(
    (s) => s.setAgentWorkspacePath,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(
    () => agentUrl.trim().length > 0 && agentToken.trim().length > 0,
    [agentToken, agentUrl],
  );

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    if (canContinue) {
      onAuthenticated();
    }
  }, [canContinue, isSubmitting, onAuthenticated]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-primary)]">
      <h1 className="text-4xl font-bold mb-2 text-white">TerminaI</h1>
      <p className="text-gray-400 mb-8">Connect to your agent (A2A) backend</p>

      <div
        style={{
          width: 520,
          maxWidth: '90vw',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
        }}
      >
        <label className="block text-sm text-gray-300 mb-2">Agent URL</label>
        <input
          className="input w-full mb-4"
          value={agentUrl}
          onChange={(e) => setAgentUrl(e.target.value)}
          placeholder="http://127.0.0.1:41242"
        />

        <label className="block text-sm text-gray-300 mb-2">Agent Token</label>
        <input
          className="input w-full mb-4"
          value={agentToken}
          onChange={(e) => setAgentToken(e.target.value)}
          placeholder="paste token"
          type="password"
        />

        <label className="block text-sm text-gray-300 mb-2">
          Workspace Path (server-side)
        </label>
        <input
          className="input w-full mb-5"
          value={agentWorkspacePath}
          onChange={(e) => setAgentWorkspacePath(e.target.value)}
          placeholder="/home/you/project"
        />

        <button
          className="btn btn-primary w-full"
          disabled={!canContinue}
          onClick={() => {
            setError(null);
            setIsSubmitting(true);
            if (!canContinue) {
              setError('Agent URL and token are required.');
              setIsSubmitting(false);
              return;
            }
            onAuthenticated();
          }}
        >
          Continue
        </button>

        {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

        <p className="mt-4 text-gray-500 text-xs">
          Local: start the agent with web-remote enabled and generate a token,
          then paste it here. Remote: use the remote server URL + token.
        </p>
      </div>
    </div>
  );
}
