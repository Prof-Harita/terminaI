/**
 * @license
 * Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useCliProcess } from './hooks/useCliProcess'
import { useSettingsStore } from './stores/settingsStore'
import { useExecutionStore } from './stores/executionStore'
import { useVoiceStore } from './stores/voiceStore'
// TriPaneLayout removed - using direct flex layout
import { ChatView } from './components/ChatView'
import { LeftSidebar } from './components/LeftSidebar'
import { EngineRoomPane } from './components/EngineRoomPane'
import { ResizableHandle } from './components/ResizableHandle'
import { ThemeProvider } from './components/ThemeProvider'
import { CommandPalette } from './components/CommandPalette'
import { SettingsPanel } from './components/SettingsPanel'
import { AuthScreen } from './components/AuthScreen'
import { ContextPopover } from './components/ContextPopover'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Button } from './components/ui/button'
import { Sun, Moon, Menu, Settings, Mic, MicOff } from 'lucide-react'
import { cn } from './lib/utils'
import { TerminaILogo } from './components/TerminaILogo'
import { KeyboardCheatSheet } from './components/KeyboardCheatSheet'

function App() {
  const {
    messages,
    isConnected,
    isProcessing,
    activeTerminalSession,
    sendMessage,
    respondToConfirmation,
  } = useCliProcess({
    onComplete: () => {
      setTimeout(() => chatInputRef.current?.focus(), 0);
    },
  })

  const { currentToolStatus, contextUsed, contextLimit, contextFiles } = useExecutionStore()
  const agentToken = useSettingsStore((s) => s.agentToken)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const provider = useSettingsStore((s) => s.provider)
  const setProvider = useSettingsStore((s) => s.setProvider)
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled)
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled)
  const voiceState = useVoiceStore((s) => s.state)

  const [showAuth, setShowAuth] = useState(true)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const isBootstrappingRef = useRef(true)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(600)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const [pendingConfirmationId, setPendingConfirmationId] = useState<
    string | null
  >(null);
  const [pendingConfirmationRequiresPin, setPendingConfirmationRequiresPin] =
    useState(false);
  const [pendingConfirmationPinReady, setPendingConfirmationPinReady] =
    useState(false);

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  // Keep legacy behavior for any code still relying on the dark class.
  useEffect(() => {
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [resolvedTheme])

  // Auto-spawn CLI backend on app start
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const bootstrap = async () => {
      try {
        // Listen for CLI ready event
        unlisten = await listen('cli-ready', (event: any) => {
          const { url, token, workspace: cliWorkspace } = event.payload
          useSettingsStore.getState().setAgentUrl(url)
          useSettingsStore.getState().setAgentToken(token)
          useSettingsStore.getState().setAgentWorkspacePath(cliWorkspace)

          setShowAuth(false)
          setIsBootstrapping(false)
          isBootstrappingRef.current = false
        })

        // Get current working directory for workspace
        const workspace = await invoke<string>('get_current_dir').catch(
          () => '/tmp',
        );

        // Spawn CLI backend
        await invoke('spawn_cli_backend', { workspace });

        // Timeout fallback - if CLI doesn't emit ready in 10s, show auth screen
        setTimeout(() => {
          if (isBootstrappingRef.current) {
            setIsBootstrapping(false)
            isBootstrappingRef.current = false
            setBootstrapError(
              'CLI backend did not respond. Please check the logs.',
            );
          }
        }, 10000);
      } catch (error) {
        console.error('Failed to spawn CLI backend:', error);
        setIsBootstrapping(false);
        setBootstrapError(
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    };

    // Only bootstrap if we don't have a token already
    if (!agentToken) {
      bootstrap();
    } else {
      setIsBootstrapping(false);
      setShowAuth(false);
    }

    return () => {
      unlisten?.();
    };
  }, [agentToken]);

  // Task 70: Notification Sound for Confirmations
  useEffect(() => {
    if (pendingConfirmationId && useSettingsStore.getState().notificationSound) {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.warn('Could not play notification sound:', e));
    }
  }, [pendingConfirmationId]);

  const clearChat = useCallback(() => {
    sendMessage('/clear')
    setTimeout(() => chatInputRef.current?.focus(), 100)
  }, [sendMessage])

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

  useKeyboardShortcuts({
    onOpenPalette: () => setIsPaletteOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
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
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false);
        setTimeout(() => chatInputRef.current?.focus(), 0);
      } else if (isPaletteOpen) {
        setIsPaletteOpen(false);
        setTimeout(() => chatInputRef.current?.focus(), 0);
      } else if (isCheatSheetOpen) {
        setIsCheatSheetOpen(false);
        setTimeout(() => chatInputRef.current?.focus(), 0);
      }
    },
  })

  // Track pending confirmation for keyboard shortcuts
  useEffect(() => {
    const pendingMsg = messages.find((m) => m.pendingConfirmation);
    const confirmation = pendingMsg?.pendingConfirmation;
    setPendingConfirmationId(confirmation?.id ?? null);
    setPendingConfirmationRequiresPin(confirmation?.requiresPin ?? false);
    setPendingConfirmationPinReady(false); // PIN ready state will be managed by ConfirmationCard (added in future task)
  }, [messages]);

  const handleLeftResize = (deltaX: number) => {
    setLeftWidth((prev) => Math.max(250, Math.min(500, prev + deltaX)))
  }

  const handleRightResize = (deltaX: number) => {
    setRightWidth((prev) => Math.max(250, Math.min(600, prev - deltaX)))
  }

  const handleCommandSelect = (command: any) => {
    if (command.action.startsWith('frontend:')) {
      const action = command.action.replace('frontend:', '');
      switch (action) {
        case 'settings':
          setIsSettingsOpen(true);
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
      }
    } else {
      sendMessage(command.action);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  if (showAuth && !agentToken) {
    return (
      <AuthScreen
        onAuthenticated={() => setShowAuth(false)}
        isBootstrapping={isBootstrapping}
        bootstrapError={bootstrapError}
      />
    )
  }

  return (
    <ThemeProvider theme={resolvedTheme}>
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col">
        {/* Header */}
        <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="h-8 w-8 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <TerminaILogo size="small" />
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs ml-4">
              <div
                className={`w-2 h-2 rounded-full ${
                  isBootstrapping
                    ? 'bg-yellow-500 animate-pulse'
                    : isConnected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                }`}
                style={{
                  boxShadow: isBootstrapping
                    ? '0 0 6px rgba(234, 179, 8, 0.6)'
                    : isConnected
                      ? '0 0 6px rgba(34, 197, 94, 0.6)'
                      : '0 0 6px rgba(239, 68, 68, 0.6)'
                }}
              />
              <span className="text-muted-foreground hidden sm:inline">
                {isBootstrapping ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {isConnected && useSettingsStore.getState().relayClientCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 font-bold ml-1 animate-in fade-in zoom-in duration-300">
                  {useSettingsStore.getState().relayClientCount} Clients
                </span>
              )}
            </div>
            {/* Model Dropdown */}
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'gemini' | 'ollama')}
              className="bg-transparent border border-border rounded px-2 py-1 text-xs text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
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
                    style={{ width: `${Math.min(100, (contextUsed / contextLimit) * 100)}%` }}
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
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop()); // Release immediately
                    setVoiceEnabled(true);
                  } catch (err) {
                    useVoiceStore.getState().setError(
                      'Microphone access denied. Please allow microphone access in your browser/system settings.'
                    );
                  }
                } else {
                  setVoiceEnabled(false);
                }
              }}
              className={cn(
                "h-8 w-8 transition-all duration-300",
                voiceEnabled && voiceState === 'LISTENING' && "bg-red-500/10 text-red-500 animate-pulse border border-red-500/50",
                voiceEnabled && voiceState === 'PROCESSING' && "bg-blue-500/10 text-blue-500",
                voiceEnabled && voiceState === 'SPEAKING' && "bg-green-500/10 text-green-500",
                !voiceEnabled && "opacity-50"
              )}
              title={voiceEnabled ? `Voice mode active (${voiceState})` : 'Enable voice mode'}
            >
              {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Three-pane layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - hidden on mobile by default */}
          {showLeftSidebar && (
            <>
              <div
                className="border-r border-border bg-sidebar overflow-hidden flex-shrink-0"
                style={{ width: `${leftWidth}px` }}
              >
                <LeftSidebar onCommandSelect={sendMessage} />
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
              onPendingConfirmation={(id, requiresPin, pinReady) => {
                setPendingConfirmationId(id);
                setPendingConfirmationRequiresPin(requiresPin ?? false);
                setPendingConfirmationPinReady(pinReady ?? false);
              }}
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
            />
          </div>
        </div>

        {/* Global Overlays */}
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => {
            setIsPaletteOpen(false)
            setTimeout(() => chatInputRef.current?.focus(), 0)
          }}
          onSelect={(cmd) => {
            handleCommandSelect(cmd);
            setIsPaletteOpen(false)
            setTimeout(() => chatInputRef.current?.focus(), 0)
          }}
        />
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false)
            setTimeout(() => chatInputRef.current?.focus(), 0)
          }}
          sendMessage={sendMessage}
        />
        <KeyboardCheatSheet
          isOpen={isCheatSheetOpen}
          onClose={() => {
            setIsCheatSheetOpen(false)
            setTimeout(() => chatInputRef.current?.focus(), 0)
          }}
        />
      </div>
    </ThemeProvider>
  )
}

export default App

