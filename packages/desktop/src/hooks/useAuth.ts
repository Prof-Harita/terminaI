import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Listen for OAuth callback
    const unlistenSuccess = listen<string>('oauth-callback', async (event) => {
      setAuthState({ isAuthenticated: true, isLoading: false, error: null });
      // Pass the auth code to CLI for token exchange
      try {
        await invoke('send_to_cli', { message: `__oauth_code:${event.payload}` });
      } catch (err) {
        console.error('Failed to send auth code to CLI:', err);
      }
    });

    // Listen for OAuth errors
    const unlistenError = listen<string>('oauth-error', (event) => {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: event.payload,
      });
    });

    return () => {
      unlistenSuccess.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  const signIn = useCallback(async () => {
    setAuthState({ isAuthenticated: false, isLoading: true, error: null });
    try {
      await invoke('start_oauth');
    } catch (err) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: String(err),
      });
    }
  }, []);

  const signOut = useCallback(() => {
    setAuthState({ isAuthenticated: false, isLoading: false, error: null });
  }, []);

  return { ...authState, signIn, signOut };
}
