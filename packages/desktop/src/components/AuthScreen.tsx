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
  isBootstrapping?: boolean;
  bootstrapError?: string | null;
}

export function AuthScreen({
  onAuthenticated,
  isBootstrapping,
  bootstrapError,
}: Props) {
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

  // Show bootstrapping state
  if (isBootstrapping) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
        <h1 className="text-4xl font-bold mb-2">TerminaI</h1>
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Starting agent backend...</span>
        </div>
        {bootstrapError && (
          <p className="mt-4 text-destructive text-sm">{bootstrapError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-2">TerminaI</h1>
      <p className="text-muted-foreground mb-8">
        Connect to your agent (A2A) backend
      </p>

      <div className="w-[520px] max-w-[90vw] bg-card border border-border rounded-lg p-6 shadow-sm">
        <label className="block text-sm text-foreground/70 mb-2">
          Agent URL
        </label>
        <input
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mb-4"
          value={agentUrl}
          onChange={(e) => setAgentUrl(e.target.value)}
          placeholder="http://127.0.0.1:41242"
        />

        <label className="block text-sm text-foreground/70 mb-2">
          Agent Token
        </label>
        <input
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mb-4"
          value={agentToken}
          onChange={(e) => setAgentToken(e.target.value)}
          placeholder="paste token"
          type="password"
        />

        <label className="block text-sm text-foreground/70 mb-2">
          Workspace Path (server-side)
        </label>
        <input
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mb-5"
          value={agentWorkspacePath}
          onChange={(e) => setAgentWorkspacePath(e.target.value)}
          placeholder="/home/you/project"
        />

        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-full"
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

        {error && <p className="mt-4 text-destructive text-sm">{error}</p>}

        <p className="mt-4 text-muted-foreground text-xs">
          Local: start the agent with web-remote enabled and generate a token,
          then paste it here. Remote: use the remote server URL + token.
        </p>
      </div>
    </div>
  );
}
