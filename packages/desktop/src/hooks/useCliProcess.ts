import { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { CliEvent, Message } from '../types/cli';
import { detectOutputType } from '../utils/outputDetector';

export function useCliProcess() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTerminalSession, setActiveTerminalSession] = useState<string | null>(null);
  const currentMessageRef = useRef<Message | null>(null);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      // Start CLI on mount
      try {
        await invoke('start_cli');
        setIsConnected(true);
      } catch (err) {
        console.error('Failed to start CLI:', err);
      }

      // Listen for CLI output
      unlisten = await listen<string>('cli-output', (event) => {
        handleCliOutput(event.payload);
      });
    };

    setup();

    return () => {
      unlisten?.();
      invoke('stop_cli').catch(console.error);
    };
  }, []);

  const handleCliOutput = (payload: string) => {
    try {
      // Check for TUI output first
      const outputType = detectOutputType(payload);
      
      if (outputType === 'tui' && !activeTerminalSession) {
        // If we detect TUI start sequence and aren't in a session, trigger one.
        // We default to a shell since we can't infer the exact command from just output.
        startTerminalSession('bash', []).catch(console.error);
      }

      const parsed: CliEvent = JSON.parse(payload);
      handleCliEvent(parsed);
    } catch {
      // Plain text output
      appendToCurrentMessage(payload);
    }
  };

  const handleCliEvent = (event: CliEvent) => {
    if (event.type === 'text' && event.content) {
      appendToCurrentMessage(event.content);
    } else if (event.type === 'confirmation') {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              pendingConfirmation: {
                id: event.confirmationId || '',
                description: event.content || '',
                command: (event.toolArgs?.command as string) || '',
                riskLevel: event.riskLevel || 'moderate',
              },
            },
          ];
        }
        return prev;
      });
    } else if (event.type === 'tool_call') {
      // Check if tool is interactive/terminal based
      if (['view_file', 'edit_file'].includes(event.toolName || '')) {
        // For simple file ops, we might stay in chat, but for interactive apps:
      }
      // If the tool is an interactive command (pseudo-check)
      if (event.toolArgs?.command && isInteractive(event.toolArgs.command as string)) {
        startTerminalSession(event.toolArgs.command as string, []);
      }
    } else if (event.type === 'done') {
      setIsProcessing(false);
      currentMessageRef.current = null;
    } else if (event.type === 'error') {
      appendToCurrentMessage(`Error: ${event.content}`);
      setIsProcessing(false);
    }
  };

  const appendToCurrentMessage = (text: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + text },
        ];
      } else {
        // Create new assistant message
        const newMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: text,
          events: [],
        };
        currentMessageRef.current = newMsg;
        return [...prev, newMsg];
      }
    });
  };

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      events: [],
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      await invoke('send_to_cli', { message: text });
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsProcessing(false);
    }
  }, []);

  const respondToConfirmation = useCallback(async (id: string, approved: boolean) => {
    try {
      await invoke('send_to_cli', { message: approved ? 'y' : 'n' });
      // Clear pending confirmation
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.pendingConfirmation?.id === id) {
          return [
            ...prev.slice(0, -1),
            { ...last, pendingConfirmation: undefined },
          ];
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to respond to confirmation:', err);
    }
  }, []);

  const startTerminalSession = useCallback(async (command: string, args: string[]) => {
    const sessionId = crypto.randomUUID();
    try {
      await invoke('start_pty_session', { sessionId, command, args });
      setActiveTerminalSession(sessionId);
    } catch (err) {
      console.error('Failed to start PTY:', err);
      // Fallback to chat error?
    }
  }, []);

  const closeTerminal = useCallback(async () => {
    if (activeTerminalSession) {
      await invoke('stop_pty_session', { sessionId: activeTerminalSession });
      setActiveTerminalSession(null);
    }
  }, [activeTerminalSession]);

  return {
    messages,
    isConnected,
    isProcessing,
    activeTerminalSession,
    sendMessage,
    respondToConfirmation,
    closeTerminal
  };
}

function isInteractive(cmd: string): boolean {
  return /^(vim|nano|htop|top|less|more|man|ssh)/.test(cmd);
}
