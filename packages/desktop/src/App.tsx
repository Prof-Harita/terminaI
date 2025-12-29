/**
 * @license
 * Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect } from 'react'
import { useCliProcess } from './hooks/useCliProcess'
import { useSettingsStore } from './stores/settingsStore'
import { useExecutionStore } from './stores/executionStore'
// TriPaneLayout removed - using direct flex layout
import { ChatView } from './components/ChatView'
import { LeftSidebar } from './components/LeftSidebar'
import { EngineRoomPane } from './components/EngineRoomPane'
import { ResizableHandle } from './components/ResizableHandle'
import { ThemeProvider } from './components/ThemeProvider'
import { CommandPalette } from './components/CommandPalette'
import { SettingsPanel } from './components/SettingsPanel'
import { AuthScreen } from './components/AuthScreen'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Button } from './components/ui/button'
import { Sun, Moon, Menu, Settings } from 'lucide-react'
import { TerminaILogo } from './components/TerminaILogo'

function App() {
  const {
    messages,
    isConnected,
    isProcessing,
    activeTerminalSession,
    sendMessage,
    respondToConfirmation,
  } = useCliProcess()

  const { currentToolStatus } = useExecutionStore()
  const agentToken = useSettingsStore((s) => s.agentToken)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const [showAuth, setShowAuth] = useState(true)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(600)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

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

  useKeyboardShortcuts({
    onOpenPalette: () => setIsPaletteOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
    onFocusChat: () => chatInputRef.current?.focus(),
  })

  // Keyboard shortcuts handler is configured above

  const handleLeftResize = (deltaX: number) => {
    setLeftWidth((prev) => Math.max(250, Math.min(500, prev + deltaX)))
  }

  const handleRightResize = (deltaX: number) => {
    setRightWidth((prev) => Math.max(250, Math.min(600, prev - deltaX)))
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  if (showAuth && !agentToken) {
    return <AuthScreen onAuthenticated={() => setShowAuth(false)} />
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
          </div>
          <div className="flex items-center gap-1">
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
          onClose={() => setIsPaletteOpen(false)}
          onSelect={(cmd) => {
            sendMessage(cmd.action)
            setIsPaletteOpen(false)
          }}
        />
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </ThemeProvider>
  )
}

export default App

