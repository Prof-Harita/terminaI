/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: 'Ctrl+K', action: 'Open command palette' },
  { keys: 'Ctrl+N', action: 'New conversation' },
  { keys: 'Ctrl+,', action: 'Open settings' },
  { keys: 'Ctrl+J', action: 'Focus chat input' },
  { keys: 'Ctrl+T', action: 'Toggle terminal' },
  { keys: 'Ctrl+/', action: 'Show this cheat sheet' },
  { keys: 'Ctrl+Enter', action: 'Approve pending action' },
  { keys: 'Esc', action: 'Cancel / Close modal' },
  { keys: '↑', action: 'Recall previous message' },
  { keys: 'Enter', action: 'Send message' },
  { keys: 'Shift+Enter', action: 'New line in message' },
];

export function KeyboardCheatSheet({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span role="img" aria-label="keyboard">⌨️</span> Keyboard Shortcuts
        </h2>
        <div className="space-y-2">
          {shortcuts.map(({ keys, action }) => (
            <div key={keys} className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-sm">{action}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono border border-border/50 shadow-sm">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
          Press Esc or click outside to close
        </p>
      </div>
    </div>
  );
}
