/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useCliProcess } from './hooks/useCliProcess';
import { useSettingsStore } from './stores/settingsStore';
import { useSidecarStore } from './stores/sidecarStore';
import { useExecutionStore } from './stores/executionStore';
import { useVoiceStore } from './stores/voiceStore';
// TriPaneLayout removed - using direct flex layout
import { ChatView } from './components/ChatView';
import { SidePanel } from './components/SidePanel';
import type { ActivityView } from './components/ActivityBar';
import { ActivityBar } from './components/ActivityBar';
import { EngineRoomPane } from './components/EngineRoomPane';
import { ResizableHandle } from './components/ResizableHandle';
import { ThemeProvider } from './components/ThemeProvider';
import { CommandPalette } from './components/CommandPalette';
import { AuthWizard } from './components/AuthWizard';
import { AuthScreen } from './components/AuthScreen';
import { ContextPopover } from './components/ContextPopover';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Button } from './components/ui/button';
import { Sun, Moon, Settings, Mic, MicOff } from 'lucide-react';
import { cn } from './lib/utils';
import { TerminaILogo } from './components/TerminaILogo';
import { KeyboardCheatSheet } from './components/KeyboardCheatSheet';

import { useSidecar } from './hooks/useSidecar';
import { ConnectivityIndicator } from './components/ConnectivityIndicator';
import { createAuthClient } from './utils/authClient';

function App() {
  // Use V2 Sidecar Hook (handles connection lifecycle)
  useSidecar();

  const cliOptions = useCallback(() => {
    setTimeout(() => chatInputRef.current?.focus(), 0);
  }, []);

  const {
    messages,
    isConnected,
    isProcessing,
    activeTerminalSession,
    sendMessage,
    respondToConfirmation,
    sendToolInput,
    stop,
  } = useCliProcess({ onComplete: cliOptions });

  const { currentToolStatus, contextUsed, contextLimit, contextFiles } =
    useExecutionStore();
  const agentUrl = useSettingsStore((s) => s.agentUrl);
  const agentToken = useSettingsStore((s) => s.agentToken);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const provider = useSettingsStore((s) => s.provider);
  const setProvider = useSettingsStore((s) => s.setProvider);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
  const voiceState = useVoiceStore((s) => s.state);

  // Get sidecar status for AuthScreen
  const bootStatus = useSidecarStore((s) => s.bootStatus);
  const sidecarError = useSidecarStore((s) => s.error);

  // Auth/Bootstrap State managed by useSidecarStore now, but legacy AuthScreen checks settingsStore.
  // If agentToken is present, showAuth becomes false.
  // We can derive showAuth locally or keep it simple.
  const [showAuth, setShowAuth] = useState(!agentToken);

  // Task 20: LLM Auth Wizard Overlay state
  const [llmAuthStatus, setLlmAuthStatus] = useState<
    'unknown' | 'ok' | 'required' | 'in_progress' | 'error'
  >('unknown');
  const [llmAuthMessage, setLlmAuthMessage] = useState<string | null>(null);

  const refreshLlmAuthStatus = useCallback(async () => {
    if (!agentUrl || !agentToken) {
      setLlmAuthStatus('unknown');
      setLlmAuthMessage(null);
      return;
    }
    try {
      const client = createAuthClient(agentUrl, agentToken);
      const status = await client.getStatus();
      setLlmAuthStatus(status.status);
      setLlmAuthMessage(status.message ?? null);
    } catch (e) {
      setLlmAuthStatus('error');
      setLlmAuthMessage(
        e instanceof Error
          ? e.message
          : 'Failed to check authentication status',
      );
    }
  }, [agentToken, agentUrl]);

  useEffect(() => {
    if (agentToken) setShowAuth(false);
  }, [agentToken]);

  useEffect(() => {
    void refreshLlmAuthStatus();
  }, [refreshLlmAuthStatus]);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSwitchProviderOpen, setIsSwitchProviderOpen] = useState(false);
  const [isSettingsOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<ActivityView | null>(
    'history',
  );
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(600);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [pendingConfirmationId, setPendingConfirmationId] = useState<
    string | null
  >(null);
  const [pendingConfirmationRequiresPin, setPendingConfirmationRequiresPin] =
    useState(false);
  const [pendingConfirmationPinReady, setPendingConfirmationPinReady] =
    useState(false);
  const openaiConfig = useSettingsStore((s) => s.openaiConfig);

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  // Keep legacy behavior for any code still relying on the dark class.
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Task 70: Notification Sound for Confirmations
  useEffect(() => {
    if (
      pendingConfirmationId &&
      useSettingsStore.getState().notificationSound
    ) {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio
        .play()
        .catch((e) => console.warn('Could not play notification sound:', e));
    }
  }, [pendingConfirmationId]);

  /* --- Key Fix: clearChat delegates to /clear command --- */
  const clearChat = useCallback(() => {
    // Phase 3: Delegate to Registry via /clear command
    // This handles SessionManager.startNewSession() and ui.clearMessages()
    sendMessage('/clear');

    setTimeout(() => chatInputRef.current?.focus(), 100);
  }, [sendMessage]);

  // Handler for pending confirmation updates from ChatView
  const handlePendingConfirmation = useCallback(
    (id: string | null, requiresPin?: boolean, pinReady?: boolean) => {
      setPendingConfirmationId(id);
      setPendingConfirmationRequiresPin(requiresPin ?? false);
      setPendingConfirmationPinReady(pinReady ?? false);
    },
    [],
  );

  // Auto-focus chat input when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      // Only focus if we're on the main chat view (not in modals)
      if (!isPaletteOpen && !isSettingsOpen && !showAuth) {
        setTimeout(() => chatInputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isPaletteOpen, isSettingsOpen, showAuth]);

  const shortcuts = useMemo(
    () => ({
      onOpenPalette: () => setIsPaletteOpen(true),
      onOpenSettings: () => setActiveActivity('preference'),
      onFocusChat: () => chatInputRef.current?.focus(),
      onNewConversation: clearChat,
      onShowCheatSheet: () => setIsCheatSheetOpen(true),
      onApprove: () => {
        if (pendingConfirmationId) {
          // Don't approve if PIN required but not ready
          if (pendingConfirmationRequiresPin && !pendingConfirmationPinReady) {
            return;
          }
          respondToConfirmation(pendingConfirmationId, true);
          setPendingConfirmationId(null);
          setPendingConfirmationRequiresPin(false);
          setPendingConfirmationPinReady(false);
          setTimeout(() => chatInputRef.current?.focus(), 0);
        }
      },
      onEscape: () => {
        if (pendingConfirmationId) {
          respondToConfirmation(pendingConfirmationId, false);
          setPendingConfirmationId(null);
          setTimeout(() => chatInputRef.current?.focus(), 0);
        } else if (activeActivity && activeActivity !== 'history') {
          setActiveActivity('history');
          setTimeout(() => chatInputRef.current?.focus(), 0);
        } else if (isPaletteOpen) {
          setIsPaletteOpen(false);
          setTimeout(() => chatInputRef.current?.focus(), 0);
        } else if (isCheatSheetOpen) {
          setIsCheatSheetOpen(false);
          setTimeout(() => chatInputRef.current?.focus(), 0);
        }
      },
    }),
    [
      clearChat,
      pendingConfirmationId,
      pendingConfirmationRequiresPin,
      pendingConfirmationPinReady,
      respondToConfirmation,
      activeActivity,
      isPaletteOpen,
      isCheatSheetOpen,
    ],
  );

  useKeyboardShortcuts(shortcuts);

  // Track pending confirmation for keyboard shortcuts
  useEffect(() => {
    const pendingMsg = messages.find((m) => m.pendingConfirmation);
    const confirmation = pendingMsg?.pendingConfirmation;
    setPendingConfirmationId(confirmation?.id ?? null);
    setPendingConfirmationRequiresPin(confirmation?.requiresPin ?? false);
    setPendingConfirmationPinReady(false); // PIN ready state will be managed by ConfirmationCard (added in future task)
  }, [messages]);

  const handleLeftResize = (deltaX: number) => {
    setLeftWidth((prev) => Math.max(250, Math.min(500, prev + deltaX)));
  };

  const handleRightResize = (deltaX: number) => {
    setRightWidth((prev) => Math.max(250, Math.min(600, prev - deltaX)));
  };

  const handleCommandSelect = (command: { action: string }) => {
    if (command.action.startsWith('frontend:')) {
      const action = command.action.replace('frontend:', '');
      switch (action) {
        case 'settings':
          setActiveActivity('preference');
          break;
        case 'palette':
          setIsPaletteOpen(true);
          break;
        case 'new-chat':
          clearChat();
          break;
        case 'shortcuts':
          setIsCheatSheetOpen(true);
          break;
        case 'auth-switch':
          setIsSwitchProviderOpen(true);
          break;
        default:
          break;
      }
    } else {
      sendMessage(command.action);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  if (showAuth && !agentToken) {
    return (
      <AuthScreen
        onAuthenticated={() => setShowAuth(false)}
        isBootstrapping={bootStatus === 'booting'}
        bootstrapError={sidecarError}
      />
    );
  }

  return (
    <ThemeProvider theme={resolvedTheme}>
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col">
        {/* Header */}
        <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TerminaILogo size="small" />
            <ConnectivityIndicator />
            {/* Model Dropdown */}
            <select
              value={provider}
              onChange={(e) => {
                const newProvider = e.target.value as
                  | 'gemini'
                  | 'ollama'
                  | 'openai_compatible';
                if (newProvider === 'openai_compatible') {
                  // Open wizard to configure OpenAI-compatible provider properly
                  setIsSwitchProviderOpen(true);
                } else {
                  setProvider(newProvider);
                }
              }}
              className="bg-transparent border border-border rounded px-2 py-1 text-xs text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
              <option value="openai_compatible">OpenAI</option>
            </select>
            {/* Context Usage Indicator with Popover */}
            <ContextPopover
              files={contextFiles}
              totalUsed={contextUsed}
              totalLimit={contextLimit}
            >
              <div className="flex items-center gap-1.5 ml-2 cursor-pointer">
                <div
                  className="w-16 h-1.5 bg-muted rounded-full overflow-hidden border border-border/30"
                  title={`Context Usage: ${Math.round((contextUsed / contextLimit) * 100)}% (${contextUsed.toLocaleString()} / ${contextLimit.toLocaleString()} tokens)`}
                >
                  <div
                    className={`h-full transition-all duration-500 ${
                      contextUsed / contextLimit > 0.9
                        ? 'bg-red-500 animate-pulse'
                        : contextUsed / contextLimit > 0.7
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (contextUsed / contextLimit) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </ContextPopover>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (!voiceEnabled) {
                  // Check permission first
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                      audio: true,
                    });
                    stream.getTracks().forEach((track) => track.stop()); // Release immediately
                    setVoiceEnabled(true);
                  } catch (err) {
                    console.error('Microphone permission error:', err);
                    useVoiceStore
                      .getState()
                      .setError(
                        `Microphone access denied: ${err instanceof Error ? err.message : String(err)}`,
                      );
                  }
                } else {
                  setVoiceEnabled(false);
                }
              }}
              className={cn(
                'h-8 w-8 transition-all duration-300',
                voiceEnabled &&
                  voiceState === 'LISTENING' &&
                  'bg-red-500/10 text-red-500 animate-pulse border border-red-500/50',
                voiceEnabled &&
                  voiceState === 'PROCESSING' &&
                  'bg-blue-500/10 text-blue-500',
                voiceEnabled &&
                  voiceState === 'SPEAKING' &&
                  'bg-green-500/10 text-green-500',
                !voiceEnabled && 'opacity-50',
              )}
              title={
                voiceEnabled
                  ? `Voice mode active (${voiceState})`
                  : 'Enable voice mode'
              }
            >
              {voiceEnabled ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveActivity('preference')}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Three-pane layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Activity Bar */}
          <ActivityBar
            activeView={activeActivity}
            onViewChange={setActiveActivity}
            onNewChat={clearChat}
          />

          {/* Side Panel */}
          {activeActivity && (
            <>
              <div
                className="border-r border-border bg-sidebar overflow-hidden flex-shrink-0"
                style={{ width: `${leftWidth}px` }}
              >
                <SidePanel
                  activeView={activeActivity}
                  sendMessage={sendMessage}
                />
              </div>

              {/* Left Resizer */}
              <ResizableHandle onResize={handleLeftResize} />
            </>
          )}

          {/* Middle Chat Pane */}
          <div className="flex-1 overflow-hidden min-w-0">
            <ChatView
              messages={messages}
              isConnected={isConnected}
              isProcessing={isProcessing}
              currentToolStatus={currentToolStatus}
              sendMessage={sendMessage}
              respondToConfirmation={respondToConfirmation}
              inputRef={chatInputRef}
              voiceEnabled={voiceEnabled}
              onPendingConfirmation={handlePendingConfirmation}
              onStop={stop}
              onOpenSettings={() => setActiveActivity('preference')}
              onSwitchProvider={() => setIsSwitchProviderOpen(true)}
            />
          </div>

          {/* Right Resizer */}
          <ResizableHandle onResize={handleRightResize} />

          {/* Right Terminal Pane */}
          <div
            className="border-l border-border bg-card overflow-hidden flex-shrink-0"
            style={{ width: `${rightWidth}px` }}
          >
            <EngineRoomPane
              terminalSessionId={activeTerminalSession}
              onCloseTerminal={() => {}}
              sendToolInput={sendToolInput}
            />
          </div>
        </div>

        {/* Global Overlays */}
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => {
            setIsPaletteOpen(false);
            setTimeout(() => chatInputRef.current?.focus(), 0);
          }}
          onSelect={(cmd) => {
            handleCommandSelect(cmd);
            setIsPaletteOpen(false);
            setTimeout(() => chatInputRef.current?.focus(), 0);
          }}
        />

        <KeyboardCheatSheet
          isOpen={isCheatSheetOpen}
          onClose={() => {
            setIsCheatSheetOpen(false);
            setTimeout(() => chatInputRef.current?.focus(), 0);
          }}
        />

        {agentToken && llmAuthStatus !== 'ok' && !isSwitchProviderOpen && (
          <AuthWizard
            status={llmAuthStatus}
            message={llmAuthMessage}
            onComplete={() => void refreshLlmAuthStatus()}
          />
        )}

        {isSwitchProviderOpen && (
          <AuthWizard
            status="ok"
            message={null}
            onComplete={() => {
              setIsSwitchProviderOpen(false);
              void refreshLlmAuthStatus();
            }}
            mode="switch_provider"
            initialOpenAIValues={openaiConfig}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
