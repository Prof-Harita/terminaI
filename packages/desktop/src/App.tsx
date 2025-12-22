/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatView } from './components/ChatView';
import { SessionsSidebar } from './components/SessionsSidebar';
import { CommandPalette } from './components/CommandPalette';
import { SettingsPanel } from './components/SettingsPanel';
import { AuthScreen } from './components/AuthScreen';
import { SplitLayout } from './components/SplitLayout';
import { EmbeddedTerminal } from './components/EmbeddedTerminal';
import { useCliProcess } from './hooks/useCliProcess';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { Command } from './data/commands';
import { useSettingsStore } from './stores/settingsStore';

function App() {
  const {
    messages,
    isConnected,
    isProcessing,
    activeTerminalSession,
    sendMessage,
    respondToConfirmation,
    closeTerminal,
  } = useCliProcess();

  const agentToken = useSettingsStore((s) => s.agentToken);
  const [showAuth, setShowAuth] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setShowAuth(agentToken.trim().length === 0 || !isConnected);
  }, [agentToken, isConnected]);

  // Use centralized keyboard shortcuts hook
  useKeyboardShortcuts({
    onToggleTerminal: closeTerminal, // Close terminal if open
    onFocusChat: () => chatInputRef.current?.focus(),
    onOpenPalette: () => setIsPaletteOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
    onNewConversation: () => {
      // Clear messages would require exposing a reset in useCliProcess
      chatInputRef.current?.focus();
    },
    onEscape: () => {
      setIsPaletteOpen(false);
      setIsSettingsOpen(false);
    },
  });

  const handleCommandSelect = useCallback(
    async (command: Command) => {
      try {
        sendMessage(command.action);
      } catch (err) {
        console.error('Failed to execute command:', err);
      }
    },
    [sendMessage],
  );

  if (showAuth) {
    return <AuthScreen onAuthenticated={() => setShowAuth(false)} />;
  }

  return (
    <div
      className="h-screen w-screen flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header - Clean, minimal, good spacing */}
      <header
        className="flex items-center justify-between shrink-0"
        style={{
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        <h1
          className="font-semibold"
          style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}
        >
          TermAI
        </h1>

        <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setIsPaletteOpen(true)}
            title="Command Palette (⌘K)"
            style={{
              fontSize: 'var(--text-xs)',
              padding: 'var(--space-2) var(--space-3)',
            }}
          >
            ⌘K
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings (⌘,)"
            style={{ fontSize: 'var(--text-base)', padding: 'var(--space-2)' }}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        <SplitLayout
          leftPanel={
            <ChatView
              messages={messages}
              isConnected={isConnected}
              isProcessing={isProcessing}
              sendMessage={sendMessage}
              respondToConfirmation={respondToConfirmation}
              inputRef={chatInputRef}
            />
          }
          rightPanel={
            activeTerminalSession ? (
              <EmbeddedTerminal
                sessionId={activeTerminalSession}
                onExit={closeTerminal}
              />
            ) : null
          }
          rightPanelVisible={!!activeTerminalSession}
        />

        {/* Sessions Sidebar */}
        <SessionsSidebar />
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelect={handleCommandSelect}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
