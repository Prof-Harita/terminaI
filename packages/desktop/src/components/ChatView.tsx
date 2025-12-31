"use client"

import type React from "react"
import type { RefObject } from 'react'
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"
import type { Message } from '../types/cli'
import { useSettingsStore } from '../stores/settingsStore'
import { Loader2, Send, Paperclip, Mic, X, ChevronDown, ChevronRight, Copy, Check, RotateCcw, Edit2 } from "lucide-react"
import { useVoiceStore } from '../stores/voiceStore'
import { Waveform } from './Waveform'
import { ConfirmationCard } from './ConfirmationCard'

interface ChatViewProps {
  messages: Message[]
  isConnected: boolean
  isProcessing: boolean
  currentToolStatus?: string | null
  sendMessage: (text: string) => void
  respondToConfirmation: (id: string, approved: boolean, pin?: string) => void
  inputRef?: RefObject<HTMLTextAreaElement | null>
  onPendingConfirmation?: (id: string | null, requiresPin?: boolean, pinReady?: boolean) => void
  voiceEnabled?: boolean
  onStop?: () => void
}

// ... ToolResult component ...

export function ChatView({
  messages,
  isConnected,
  isProcessing,
  currentToolStatus,
  sendMessage,
  respondToConfirmation,
  inputRef,
  onPendingConfirmation,
  voiceEnabled,
  onStop,
}: ChatViewProps) {
  // ... existing hooks ...

 // ... inside return ...
 // ... Microhone Issue block ...

  const voiceState = useVoiceStore((s) => s.state);
  const voiceError = useVoiceStore((s) => s.error);
  const [input, setInput] = useState(() => {
    return localStorage.getItem('terminai_chat_draft') || '';
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize user message history (most recent first)
  const userMessages = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .reverse(),
    [messages],
  );
  const scrollRef = useRef<HTMLDivElement>(null)
  const internalInputRef = useRef<HTMLTextAreaElement>(null)
  const actualInputRef = inputRef || internalInputRef
  const timestampsRef = useRef<Map<string, number>>(new Map())

  // Include tool events for execution logs
  const filteredMessages = messages.map(msg => ({
    ...msg,
    events: msg.events ?? []
  })).filter(msg => 
    msg.content || 
    msg.pendingConfirmation || 
    msg.events.some(e => ['text', 'tool_call', 'tool_result'].includes(e.type))
  )

  const examplePrompts = [
    'List all files in the current directory',
    'Show my git status',
    'Install dependencies for this project',
  ];

  const displayMessages =
    filteredMessages.length === 0
      ? [
          {
            id: 'welcome',
            role: 'assistant' as const,
            pendingConfirmation: undefined,
            content:
              "Hello! I'm your terminal agent assistant. I can help you execute commands, manage files, and automate your workflows.\n\nTry one of these to get started:",
            events: [],
            examplePrompts,
          },
        ]
      : filteredMessages;

  // Check if we need to show API key prompt
  const needsApiKey = !useSettingsStore((s) => s.agentToken);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Task 36: @ Autocomplete state
  const [showFileSuggestions, setShowFileSuggestions] = useState(false);
  const [fileQuery, setFileQuery] = useState('');
  const mockFiles = ['README.md', 'package.json', 'src/App.tsx', 'src/main.tsx', 'tsconfig.json'];
  const filteredFiles = mockFiles.filter(f => f.toLowerCase().includes(fileQuery.toLowerCase()));

  // Track pending confirmation for keyboard shortcuts
  useEffect(() => {
    const pendingMsg = messages.find((m) => m.pendingConfirmation);
    const confirmation = pendingMsg?.pendingConfirmation;
    onPendingConfirmation?.(
      confirmation?.id ?? null,
      confirmation?.requiresPin ?? false,
      false, // PIN ready state will be managed by ConfirmationCard (added in future task)
    );
  }, [messages, onPendingConfirmation]);

  // Task 45: Secondary status for long tools
  const [showLongRunningWarning, setShowLongRunningWarning] = useState(false);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isProcessing && currentToolStatus) {
      timer = setTimeout(() => setShowLongRunningWarning(true), 5000);
    } else {
      setShowLongRunningWarning(false);
    }
    return () => clearTimeout(timer);
  }, [isProcessing, currentToolStatus]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [filteredMessages, scrollToBottom])

  // Save draft to localStorage
  useEffect(() => {
    localStorage.setItem('terminai_chat_draft', input);
  }, [input]);

  const handleSendMessage = () => {
    if (input.trim() || attachments.length > 0) {
      sendMessage(input);
      setInput("");
      setAttachments([]);
      localStorage.removeItem('terminai_chat_draft');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      setHistoryIndex(-1);
      return;
    }

    // Up-Arrow: Navigate to older messages
    if (e.key === 'ArrowUp' && (input === '' || historyIndex >= 0)) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, userMessages.length - 1);
      if (newIndex >= 0 && userMessages[newIndex]) {
        setHistoryIndex(newIndex);
        setInput(userMessages[newIndex]);
      }
      return;
    }

    // Down-Arrow: Navigate to newer messages
    if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      if (newIndex < 0) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(userMessages[newIndex]);
      }
      return;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {voiceError && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="text-red-500 mt-0.5">!</div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-500">Microphone Issue</h4>
            <p className="text-xs text-muted-foreground">{voiceError}</p>
            <button 
              onClick={() => useVoiceStore.getState().setError(null)}
              className="mt-2 text-[10px] text-red-500 hover:underline font-medium"
            >
              Dismiss
            </button>
          </div>
            <button 
              onClick={(e) => { 
                e.preventDefault(); 
                // Send a specific, safe prompt that encourages checking external docs instead of internal code.
                sendMessage("I am getting a 'Microphone Access Denied' error on Linux. Please search the web or documentation for 'Tauri 2 Linux microphone permissions WebKitGTK'. Do NOT analyze the local codebase as this is a platform issue, not a code issue.");
              }}
              className="text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-500 px-2 py-1 rounded"
            >
              Fix Instructions
            </button>
        </div>
      )}
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-16 scroll-smooth" ref={scrollRef}>
        {needsApiKey && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[85%] rounded-lg px-4 py-4 bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔑</span>
                <span className="font-semibold text-amber-500">API Key Required</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                To get started, you need a Gemini API key.
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
              >
                Get API Key →
              </a>
            </div>
          </div>
        )}
        {displayMessages.map((message, idx) => {
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
                  ? "bg-primary text-primary-foreground relative group"
                  : "bg-muted text-foreground border border-border relative group",
              )}
            >
              {message.role === "user" && (
                <button
                  onClick={() => {
                    setInput(message.content);
                    actualInputRef.current?.focus();
                  }}
                  className="absolute -left-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-foreground"
                  title="Edit message"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {message.role === "assistant" && (
                <button
                  onClick={() => navigator.clipboard.writeText(message.content)}
                  className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-foreground"
                  title="Copy message"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
              {message.content && (
                <div className="whitespace-pre-wrap break-words inline">
                  {message.content}
                  {isProcessing && idx === displayMessages.length - 1 && message.role === "assistant" && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                  )}
                </div>
              )}
              
              {/* Task 41/42: Execution Logs */}
              {message.events.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.events.map((event, eventIdx) => {
                    if (event.type === 'tool_call' || event.type === 'tool_result') {
                      return (
                        <ToolLog 
                          key={eventIdx} 
                          event={event} 
                          onRetry={(name, args) => {
                            const argsStr = args ? ` with ${JSON.stringify(args)}` : '';
                            sendMessage(`Retry failed tool ${name}${argsStr}`);
                          }}
                        />
                      )
                    }
                    return null
                  })}
                </div>
              )}

              {/* Render Pending Confirmation Card */}
              {message.pendingConfirmation && (
                <div className="mt-4 max-w-md">
                  <ConfirmationCard 
                    confirmation={message.pendingConfirmation}
                    onRespond={(approved, pin) => {
                      if (message.pendingConfirmation?.id) {
                        respondToConfirmation(message.pendingConfirmation.id, approved, pin);
                      }
                    }}
                  />
                </div>
              )}

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div className="flex flex-col">
                <span>{currentToolStatus || "Agent is executing commands..."}</span>
                {showLongRunningWarning && (
                  <span className="text-[10px] text-amber-500/80 animate-pulse">
                    This is taking longer than expected...
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={() => {
                 if (onStop) {
                   onStop();
                 } else {
                   sendMessage('/stop');
                 }
              }}
            >
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div 
        className={cn(
          "p-4 bg-transparent transition-colors",
          isDragging ? "bg-accent/20" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col border border-border/60 rounded-xl bg-background/50 shadow-sm focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all overflow-hidden relative">
          
          {/* File suggestions popover positioned relative to container */}
          {showFileSuggestions && filteredFiles.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-md shadow-xl overflow-hidden z-50">
                <div className="p-2 border-b border-border bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Files in workspace
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredFiles.map((file) => (
                    <button
                      key={file}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors truncate"
                      onClick={() => {
                        const parts = input.split(' ');
                        parts[parts.length - 1] = `@${file}`;
                        setInput(parts.join(' ') + ' ');
                        setShowFileSuggestions(false);
                        actualInputRef.current?.focus();
                      }}
                    >
                      {file}
                    </button>
                  ))}
                </div>
              </div>
          )}

          {/* Attachment Chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachments.map((file, i) => (
                <span key={i} className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted/50 border border-border/50 rounded-md text-xs animate-in fade-in zoom-in-95">
                  <span className="max-w-[150px] truncate text-xs">{file.name}</span>
                  <button
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/30 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) {
                setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
              }
            }}
          />

          <textarea
            ref={actualInputRef}
            value={input}
            onChange={(e) => {
              const newValue = e.target.value;
              setInput(newValue);
              
              const parts = newValue.split(' ');
              const lastPart = parts[parts.length - 1];
              
              if (lastPart.startsWith('@')) {
                setShowFileSuggestions(true);
                setFileQuery(lastPart.slice(1));
              } else {
                setShowFileSuggestions(false);
              }

              if (historyIndex >= 0) {
                setHistoryIndex(-1);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={isProcessing ? "Agent is thinking..." : "Ask anything, @ for context"}
            rows={1}
            disabled={isProcessing}
            className={cn(
              "w-full px-4 py-3 bg-transparent border-0 focus:ring-0 resize-none min-h-[52px] max-h-48 text-base placeholder:text-muted-foreground/40",
              isProcessing && "cursor-not-allowed opacity-60"
            )}
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = `${Math.min(target.scrollHeight, 192)}px`
            }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between px-2 pb-2 pl-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/50 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <Waveform active={!!(voiceEnabled && voiceState === 'LISTENING')} />
              </div>
              
              {voiceEnabled && (
                <Button 
                  size="icon" 
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 transition-all duration-200 rounded-full",
                    voiceState === 'LISTENING' 
                      ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )} 
                  onClick={() => {
                   const { state, startListening, stopListening } = useVoiceStore.getState();
                   if (state === 'LISTENING') stopListening(); else startListening();
                  }}
                  title={voiceState === 'LISTENING' ? "Click to stop listening" : "Click to speak"}
                >
                  <Mic className={cn("h-4 w-4", voiceState === 'LISTENING' && "animate-pulse")} />
                </Button>
              )}

              <Button 
                onClick={handleSendMessage} 
                size="icon" 
                className={cn(
                  "h-8 w-8 rounded-full transition-all shadow-sm", 
                  !input.trim() && attachments.length === 0 
                    ? "bg-muted text-muted-foreground hover:bg-muted" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                disabled={isProcessing || (!input.trim() && attachments.length === 0)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between px-1 opacity-70">
          <div className="flex items-center gap-2">
            <button 
              className="hover:text-foreground transition-colors cursor-pointer font-medium"
              onClick={() => sendMessage('/model')}
            >
              /model
            </button>
            <span>•</span>
            <span className={cn(isConnected ? "text-green-500/80" : "text-amber-500/80")}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-[9px]">
            Return to send, Shift+Return for new line
          </div>
        </div>
      </div>
    </div>
  )
}


function ToolResult({ content }: { content: string }) {
  if (!content) return null;
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-xs">
      {content}
    </pre>
  )
}

function ToolLog({ event, onRetry }: { event: any, onRetry?: (name: string, args?: any) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startTime = useRef(Date.now())

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const content = event.type === 'tool_call' 
      ? JSON.stringify(event.call, null, 2)
      : event.result?.output || event.result?.error || ''
    navigator.clipboard.writeText(String(content))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRetry && event.toolName) {
      onRetry(event.toolName, event.toolArgs)
    }
  }

  // Track elapsed time for running tools
  useEffect(() => {
    if (event.type === 'tool_call' && !event.completed) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.current) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [event.type, event.completed])

  const isError = event.type === 'tool_result' && event.result?.error
  const duration = event.duration ? `${event.duration}ms` : elapsed > 0 ? `${elapsed}s` : ''
  const label = event.type === 'tool_call' 
    ? `Running ${event.call.name}${duration ? ` (${duration})` : ''}`
    : `Result: ${event.toolName || 'tool'}${duration ? ` (${duration})` : ''}`

  // O-15: Inline error message extraction
  const errorMessage = isError && event.result?.error
    ? event.result.error.length > 80
      ? event.result.error.slice(0, 80) + '...'
      : event.result.error
    : null

  return (
    <div className="rounded border border-border/40 bg-black/20 overflow-hidden my-1">
      {/* O-15: Inline error annotation */}
      {isError && errorMessage && (
        <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border-b border-red-500/30">
          <span className="text-red-500 text-[10px] font-mono flex-1 truncate">
            ✕ {errorMessage}
          </span>
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRetry(e);
              }}
              className="text-[8px] bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-0.5 rounded font-bold uppercase ml-auto flex-shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className={cn(
            "text-[10px] font-mono truncate",
            isError ? "text-red-400" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {label}
          </span>
        </div>
        {(isOpen || isError) && (
          <div className="flex items-center gap-2">
            {isError && (
              <button 
                onClick={handleRetry}
                className="p-1 hover:bg-white/10 rounded transition-colors text-red-400 hover:text-red-300 flex items-center gap-1"
                title="Retry tool"
              >
                <RotateCcw size={10} />
                <span className="text-[8px] font-bold uppercase tracking-tighter">Retry</span>
              </button>
            )}
            {isOpen && (
              <button 
                onClick={handleCopy}
                className="p-1 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-foreground"
                title="Copy output"
              >
                {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
              </button>
            )}
          </div>
        )}
      </button>
      {isOpen && (
        <div className="px-3 py-2 border-t border-border/20 bg-black/40">
          <div className="text-[10px] font-mono overflow-x-auto text-muted-foreground/90 leading-tight">
            <ToolResult content={
              event.type === 'tool_call' 
                ? JSON.stringify(event.call.input, null, 2)
                : event.result?.output || event.result?.error || 'No output'
            } />
          </div>
        </div>
      )}
    </div>
  )
}
