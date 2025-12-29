"use client"

import { useState, useRef, useEffect } from "react"
import { Terminal, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { cn } from "../lib/utils"
import { useExecutionStore } from "../stores/executionStore"
import type { ToolEvent } from "../types/cli"

const BLOCKING_PROMPT_REGEX = /^.*(password|\[y\/n\]|confirm|enter value|sudo).*:/i

interface EngineRoomPaneProps {
  terminalSessionId: string | null
  onCloseTerminal: () => void
}

export function EngineRoomPane(_props: EngineRoomPaneProps) {
  const { toolEvents, isWaitingForInput } = useExecutionStore()
  const [isFlashing, setIsFlashing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
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
      if (event.status === "awaiting_input" || (event.terminalOutput && BLOCKING_PROMPT_REGEX.test(event.terminalOutput))) {
        const now = Date.now()
        // Debounce alerts by 2 seconds
        if (now - lastAlertTime.current > 2000) {
          triggerFlashAndSound()
          lastAlertTime.current = now
        }
      }
    })
  }, [toolEvents])

  useEffect(() => {
    if (!isWaitingForInput) {
      return
    }
    const now = Date.now()
    if (now - lastAlertTime.current > 2000) {
      triggerFlashAndSound()
      lastAlertTime.current = now
    }
  }, [isWaitingForInput])

  const triggerFlashAndSound = () => {
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 500)

    // Play notification sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((err) => console.log("Audio play failed:", err))
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full flex flex-col transition-all duration-300",
        isFlashing && "ring-4 ring-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)]",
      )}
    >
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4 bg-card">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-base font-medium">Execution Log</span>
        </div>
      </div>

      {/* Tool events */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {toolEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Awaiting tool execution...</p>
          </div>
        ) : (
          toolEvents.map((event) => (
            <ToolEventCard key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  )
}

function ToolEventCard({ event }: { event: ToolEvent }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Tool header */}
      <div className="px-4 py-2 bg-muted/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-mono font-semibold">{event.toolName}</span>
          {event.inputArguments && Object.keys(event.inputArguments).length > 0 && (
            <span className="text-xs text-muted-foreground">{JSON.stringify(event.inputArguments)}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-muted-foreground flex flex-col items-end leading-none">
            <span>{new Date(event.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            {event.completedAt && (
              <span>{((event.completedAt - event.startedAt) / 1000).toFixed(1)}s duration</span>
            )}
          </div>
          <StatusBadge status={event.status} />
        </div>
      </div>

      {/* Terminal output */}
      {event.terminalOutput && (
        <div className="p-4 bg-black/90 font-mono text-xs text-green-400 overflow-x-auto">
          <pre className="whitespace-pre-wrap break-words">{event.terminalOutput}</pre>
          {event.status === "awaiting_input" && (
            <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "running":
      return (
        <div className="flex items-center gap-1">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-xs text-blue-500">Running</span>
        </div>
      )
    case "completed":
      return (
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-500">Completed</span>
        </div>
      )
    case "failed":
      return (
        <div className="flex items-center gap-1">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-500">Failed</span>
        </div>
      )
    case "awaiting_input":
      return (
        <div className="flex items-center gap-1">
          <Loader2 className="h-4 w-4 animate-pulse text-yellow-500" />
          <span className="text-xs text-yellow-500 font-semibold">Awaiting Input</span>
        </div>
      )
    default:
      return null
  }
}
