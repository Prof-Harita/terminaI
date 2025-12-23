/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onToggleTerminal?: () => void;
  onFocusChat?: () => void;
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
  onNewConversation?: () => void;
  onEscape?: () => void;
}

// Keyboard shortcut reference:
// ⌘T / Ctrl+T: Toggle/focus terminal panel
// ⌘J / Ctrl+J: Focus chat input
// ⌘K / Ctrl+K: Open command palette
// ⌘, / Ctrl+,: Open settings
// ⌘N / Ctrl+N: New conversation
// Escape: Return to chat

export function useKeyboardShortcuts(handlers: KeyboardShortcuts) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // ⌘T: Toggle terminal
      if (isMod && e.key === 't') {
        e.preventDefault();
        handlers.onToggleTerminal?.();
        return;
      }

      // ⌘J: Focus chat
      if (isMod && e.key === 'j') {
        e.preventDefault();
        handlers.onFocusChat?.();
        return;
      }

      // ⌘K: Command palette
      if (isMod && e.key === 'k') {
        e.preventDefault();
        handlers.onOpenPalette?.();
        return;
      }

      // ⌘,: Settings
      if (isMod && e.key === ',') {
        e.preventDefault();
        handlers.onOpenSettings?.();
        return;
      }

      // ⌘N: New conversation
      if (isMod && e.key === 'n') {
        e.preventDefault();
        handlers.onNewConversation?.();
        return;
      }

      // Escape: Close/return
      if (e.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }
    },
    [handlers],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
