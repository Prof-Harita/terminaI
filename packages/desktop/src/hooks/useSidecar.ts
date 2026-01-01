import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSettingsStore } from '../stores/settingsStore';
import { useSidecarStore } from '../stores/sidecarStore';

export function useSidecar() {
  const setAgentUrl = useSettingsStore((s) => s.setAgentUrl);
  const setAgentToken = useSettingsStore((s) => s.setAgentToken);
  const setAgentWorkspace = useSettingsStore((s) => s.setAgentWorkspacePath);

  const { setBootStatus, addLog, setError } = useSidecarStore();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let unlistenReady: (() => void) | undefined;
    let unlistenOutput: (() => void) | undefined;

    const bootstrap = async () => {
      setBootStatus('booting');
      addLog('Starting Sidecar bootstrap...');

      try {
        // Listen for CLI ready event
        unlistenReady = await listen('cli-ready', (event: any) => {
          const { url, token, workspace } = event.payload;
          addLog(`Sidecar Ready: ${url}`);

          setAgentUrl(url);
          setAgentToken(token);
          setAgentWorkspace(workspace);

          setBootStatus('ready');
        });

        // Listen for CLI output (logs)
        unlistenOutput = await listen('cli-output', (event: any) => {
          if (typeof event.payload === 'string') {
            addLog(event.payload);
          }
        });

        // Get current working directory for workspace
        // G-5 FIX: Don't silently fallback to /tmp - throw error instead
        const workspace = await invoke<string>('get_current_dir');
        addLog(`Workspace resolved: ${workspace}`);

        // Spawn CLI backend
        addLog('Invoking spawn_cli_backend...');
        await invoke('spawn_cli_backend', { workspace });

        // Timeout fallback
        setTimeout(() => {
          const currentStatus = useSidecarStore.getState().bootStatus;
          if (currentStatus === 'booting') {
            setError('Sidecar connection timed out (15s). Check logs.');
          }
        }, 15000);
      } catch (error) {
        console.error('Failed to spawn sidecar:', error);
        setError(
          error instanceof Error ? error.message : 'Unknown spawn error',
        );
      }
    };

    bootstrap();

    return () => {
      unlistenReady?.();
      unlistenOutput?.();
    };
  }, []);
}
