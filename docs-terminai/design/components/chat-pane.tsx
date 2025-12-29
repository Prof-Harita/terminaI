"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Loader2, Send, Paperclip, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

interface UIMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

const mockMessages: UIMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I'm your terminal agent assistant. I can help you execute commands, manage files, and automate your workflows. What would you like to do today?",
    timestamp: Date.now() - 600000,
  },
  {
    id: "2",
    role: "user",
    content: "Can you run the lint command and fix any issues?",
    timestamp: Date.now() - 300000,
  },
  {
    id: "3",
    role: "assistant",
    content: "I'll run the lint command for you. Let me execute that now and check for any issues that need fixing.",
    timestamp: Date.now() - 200000,
  },
]

export function ChatPane() {
  const [messages, setMessages] = useState<UIMessage[]>(mockMessages)
  const [input, setInput] = useState("")
  const [isAgentThinking, setIsAgentThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const newMessage: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInput("")
    setIsAgentThinking(true)

    // Simulate agent response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I understand. Let me process that for you and execute the necessary commands.",
          timestamp: Date.now(),
        },
      ])
      setIsAgentThinking(false)
    }, 2000)
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
        {messages.map((message) => (
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
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent thinking indicator */}
      {isAgentThinking && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Agent is executing commands...</span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, @ for context"
              rows={3}
              className="w-full px-4 py-2.5 pr-10 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-base resize-none min-h-[84px] max-h-48"
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
            <Button size="icon" className="h-[42px] w-[42px] flex-shrink-0">
              <Mic className="h-4 w-4" />
            </Button>
            <Button onClick={handleSend} size="icon" className="h-[42px] w-[42px] flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
          <span>^ Planning</span>
          <span>~ Claude Opus 4.5 (Thinking)</span>
        </div>
      </div>
    </div>
  )
}
