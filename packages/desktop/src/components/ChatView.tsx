import { useRef, useEffect, RefObject } from 'react';
import { Message } from '../types/cli';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ConfirmationCard } from './ConfirmationCard';

interface Props {
  messages: Message[];
  isConnected: boolean;
  isProcessing: boolean;
  sendMessage: (text: string) => void;
  respondToConfirmation: (id: string, approved: boolean) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}

export function ChatView({
  messages,
  isConnected,
  isProcessing,
  sendMessage,
  respondToConfirmation,
  inputRef
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Connection status - Subtle inline indicator */}
      {!isConnected && (
        <div
          className="flex items-center justify-center"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--accent-subtle)',
            color: 'var(--accent)',
            fontSize: 'var(--text-sm)',
            gap: 'var(--space-2)',
          }}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
          Connecting to TermAI...
        </div>
      )}

      {/* Messages area - Proper spacing and containers */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: 'var(--space-8) var(--space-6)' }}
      >
        {/* Empty state - Centered, not overwhelming */}
        {messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full"
            style={{ gap: 'var(--space-4)' }}
          >
            <div
              style={{
                fontSize: 'var(--text-3xl)',
                marginBottom: 'var(--space-2)',
              }}
            >
              👋
            </div>
            <p
              style={{
                fontSize: 'var(--text-lg)',
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              What can I help you with?
            </p>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)',
                textAlign: 'center',
                maxWidth: '360px',
              }}
            >
              Ask about your system, run commands, or get help with terminal tasks.
            </p>
          </div>
        )}

        {/* Message list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble message={msg} />
              {msg.pendingConfirmation && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <ConfirmationCard
                    confirmation={msg.pendingConfirmation}
                    onRespond={(approved) =>
                      respondToConfirmation(msg.pendingConfirmation!.id, approved)
                    }
                  />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isProcessing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              Thinking...
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input area */}
      <ChatInput
        onSend={sendMessage}
        disabled={isProcessing || !isConnected}
        inputRef={inputRef}
      />
    </div>
  );
}
