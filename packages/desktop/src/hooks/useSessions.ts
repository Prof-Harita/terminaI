import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface Session {
  name: string;
  command: string;
  status: 'running' | 'stopped' | 'done';
  startedAt: string;
  outputLineCount: number;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    // Listen for session updates from CLI
    const unlisten = listen<Session>('session-update', (event) => {
      setSessions((prev) => {
        const existing = prev.findIndex((s) => s.name === event.payload.name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = event.payload;
          return updated;
        }
        return [...prev, event.payload];
      });
    });

    // Listen for session removal
    const unlistenRemove = listen<string>('session-removed', (event) => {
      setSessions((prev) => prev.filter((s) => s.name !== event.payload));
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenRemove.then((fn) => fn());
    };
  }, []);

  const stopSession = useCallback(async (name: string) => {
    try {
      await invoke('send_to_cli', { message: `/sessions stop ${name}` });
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  }, []);

  const viewLogs = useCallback(async (name: string) => {
    try {
      await invoke('send_to_cli', { message: `/sessions logs ${name}` });
    } catch (err) {
      console.error('Failed to view logs:', err);
    }
  }, []);

  return { sessions, stopSession, viewLogs };
}
