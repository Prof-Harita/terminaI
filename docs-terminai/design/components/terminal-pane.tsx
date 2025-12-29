"use client"

import { useState, useRef, useEffect } from "react"
import { Terminal, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToolEvent {
  id: string
  toolName: string
  inputArguments: Record<string, any>
  status: "running" | "completed" | "failed" | "awaiting_input"
  terminalOutput: string
}

const mockToolEvents: ToolEvent[] = [
  {
    id: "1",
    toolName: "npm run lint",
    inputArguments: { maxWarnings: 0 },
    status: "completed",
    terminalOutput: `~/Code/terminal $ npm run lint -- --max-warnings=0 2>&1 | tail -20

> eslint src

[watch] build started
[watch] build finished

> @terminal/web-client@0.1.0 build
> echo 'No build needed for static web client'

No build needed for static web client`,
  },
  {
    id: "2",
    toolName: "npm run build",
    inputArguments: {},
    status: "running",
    terminalOutput: `~/Code/terminal $ npm run build 2>&1 | tail -30

> @terminal/web-client@0.1.0 build
> next build

[watch] build started
[watch] build finished

Building application...`,
  },
]

const BLOCKING_PROMPT_REGEX = /^.*(password|\[y\/n\]|confirm|enter value|sudo).*:/i

export function TerminalPane() {
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>(mockToolEvents)
  const [isFlashing, setIsFlashing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastAlertTime = useRef(0)

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3")
    audioRef.current.volume = 0.5
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [toolEvents])

  useEffect(() => {
    toolEvents.forEach((event) => {
      if (event.status === "awaiting_input" || BLOCKING_PROMPT_REGEX.test(event.terminalOutput)) {
        const now = Date.now()
        // Debounce alerts by 2 seconds
        if (now - lastAlertTime.current > 2000) {
          triggerFlashAndSound()
          lastAlertTime.current = now
        }
      }
    })
  }, [toolEvents])

  const triggerFlashAndSound = () => {
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 500)

    // Play notification sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((err) => console.log("Audio play failed:", err))
    }
  }

  const simulateBlockingPrompt = () => {
    const newEvent: ToolEvent = {
      id: Date.now().toString(),
      toolName: "sudo apt install",
      inputArguments: {},
      status: "awaiting_input",
      terminalOutput: `~/Code/terminal $ sudo apt install package
[sudo] password for user:`,
    }
    setToolEvents((prev) => [...prev, newEvent])
  }

  return (
    <div
      className={cn(
        "h-full flex flex-col transition-all duration-300",
        isFlashing && "ring-4 ring-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)]",
      )}
    >
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-base font-medium">Execution Log</span>
        </div>
        <button
          onClick={simulateBlockingPrompt}
          className="text-xs px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-600 dark:text-yellow-400"
        >
          Test Alert
        </button>
      </div>

      {/* Tool events */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {toolEvents.map((event) => (
          <div key={event.id} className="border border-border rounded-lg overflow-hidden bg-card">
            {/* Tool header */}
            <div className="px-4 py-2 bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-mono font-semibold">{event.toolName}</span>
                {Object.keys(event.inputArguments).length > 0 && (
                  <span className="text-xs text-muted-foreground">{JSON.stringify(event.inputArguments)}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {event.status === "running" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-xs text-blue-500">Running</span>
                  </>
                )}
                {event.status === "completed" && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-500">Completed</span>
                  </>
                )}
                {event.status === "failed" && (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-500">Failed</span>
                  </>
                )}
                {event.status === "awaiting_input" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-pulse text-yellow-500" />
                    <span className="text-xs text-yellow-500 font-semibold">Awaiting Input</span>
                  </>
                )}
              </div>
            </div>

            {/* Terminal output */}
            <div className="p-4 bg-black/90 font-mono text-xs text-green-400 overflow-x-auto">
              <pre className="whitespace-pre-wrap break-words">{event.terminalOutput}</pre>
              {event.status === "awaiting_input" && (
                <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
