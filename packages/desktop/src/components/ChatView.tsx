"use client"

import type React from "react"
import type { RefObject } from 'react'
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "./ui/button"
import { Loader2, Send, Paperclip, Mic } from "lucide-react"
import { cn } from "../lib/utils"
import type { Message } from '../types/cli'

interface ChatViewProps {
  messages: Message[]
  isConnected: boolean
  isProcessing: boolean
  currentToolStatus?: string | null
  sendMessage: (text: string) => void
  respondToConfirmation: (id: string, approved: boolean, pin?: string) => void
  inputRef?: RefObject<HTMLTextAreaElement | null>
}

export function ChatView({
  messages,
  isConnected,
  isProcessing,
  currentToolStatus,
  sendMessage,
  inputRef,
}: ChatViewProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const internalInputRef = useRef<HTMLTextAreaElement>(null)
  const actualInputRef = inputRef || internalInputRef
  const timestampsRef = useRef<Map<string, number>>(new Map())

  // Filter out tool_call and tool_result events for clean chat
  const filteredMessages = messages.map(msg => ({
    ...msg,
    events: msg.events?.filter(e => e.type !== 'tool_call' && e.type !== 'tool_result') ?? []
  })).filter(msg => msg.content || msg.pendingConfirmation || msg.events.length > 0)

  const displayMessages =
    filteredMessages.length === 0
      ? [
          {
            id: 'welcome',
            role: 'assistant' as const,
            content:
              "Hello! I'm your terminal agent assistant. I can help you execute commands, manage files, and automate your workflows. What would you like to do today?",
            events: [],
          },
        ]
      : filteredMessages

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [filteredMessages, scrollToBottom])

  const handleSend = () => {
    if (!input.trim() || isProcessing) return
    sendMessage(input)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.map((message) => {
          const existing = timestampsRef.current.get(message.id)
          const timestamp = existing ?? Date.now()
          if (!existing) {
            timestampsRef.current.set(message.id, timestamp)
          }

          return (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-4 py-2.5 text-base leading-relaxed",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground border border-border",
              )}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              <div className={cn("text-xs mt-1.5", message.role === "user" ? "opacity-70" : "text-muted-foreground")}>
                {new Date(timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {/* Agent thinking indicator */}
      {isProcessing && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{currentToolStatus || "Agent is executing commands..."}</span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={actualInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, @ for context"
              rows={3}
              disabled={isProcessing}
              className="w-full px-4 py-2.5 pr-10 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-base resize-none min-h-[84px] max-h-48 disabled:opacity-50"
              style={{ height: "84px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = "84px"
                target.style.height = `${Math.min(target.scrollHeight, 192)}px`
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 bottom-1 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              size="icon" 
              className="h-[42px] w-[42px] flex-shrink-0" 
              disabled 
              title="Voice mode coming soon"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button onClick={handleSend} size="icon" className="h-[42px] w-[42px] flex-shrink-0" disabled={isProcessing || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
          <button 
            className="hover:text-foreground transition-colors cursor-pointer"
            onClick={() => sendMessage('/model')}
          >
            /model
          </button>
          <span className="opacity-50">•</span>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  )
}
