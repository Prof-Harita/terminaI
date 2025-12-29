"use client"

import { useState } from "react"
import { LeftSidebar } from "./left-sidebar"
import { ChatPane } from "./chat-pane"
import { TerminalPane } from "./terminal-pane"
import { ResizableHandle } from "./resizable-handle"
import { ThemeProvider } from "./theme-provider"
import { Button } from "./ui/button"
import { Moon, Sun, Menu } from "lucide-react"

export function TerminalInterface() {
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(400)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)

  const handleLeftResize = (deltaX: number) => {
    setLeftWidth((prev) => Math.max(250, Math.min(500, prev + deltaX)))
  }

  const handleRightResize = (deltaX: number) => {
    setRightWidth((prev) => Math.max(250, Math.min(600, prev - deltaX)))
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  return (
    <ThemeProvider theme={theme}>
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
            <Terminal className="h-5 w-5" />
            <div className="font-semibold text-lg">Antigravity</div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
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
                <LeftSidebar />
              </div>

              {/* Left Resizer - hidden on mobile */}
              <div className="hidden lg:block">
                <ResizableHandle onResize={handleLeftResize} />
              </div>
            </>
          )}

          {/* Middle Chat Pane */}
          <div className="flex-1 overflow-hidden min-w-0">
            <ChatPane />
          </div>

          {/* Right Resizer - hidden on mobile */}
          <div className="hidden lg:block">
            <ResizableHandle onResize={handleRightResize} />
          </div>

          {/* Right Terminal Pane */}
          <div
            className="border-l border-border bg-card overflow-hidden flex-shrink-0 hidden lg:block"
            style={{ width: `${rightWidth}px` }}
          >
            <TerminalPane />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

function Terminal({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}
