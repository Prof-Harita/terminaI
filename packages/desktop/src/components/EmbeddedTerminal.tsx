/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useSudoDetection } from '../hooks/useSudoDetection';
import { SudoPrompt } from './SudoPrompt';
import '@xterm/xterm/css/xterm.css';

interface Props {
  sessionId: string;
  onExit?: () => void;
  isExpanded?: boolean;
}

export function EmbeddedTerminal({
  sessionId,
  onExit,
  isExpanded = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [outputBuffer, setOutputBuffer] = useState('');

  const { needsPassword, prompt } = useSudoDetection(outputBuffer);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#0f0f1a',
        foreground: '#f0f0f0',
        cursor: '#00d4ff',
        selectionBackground: '#264f78',
      },
      cursorBlink: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    // Focus tracking
    terminal.textarea?.addEventListener('focus', () => setIsFocused(true));
    terminal.textarea?.addEventListener('blur', () => setIsFocused(false));

    // Receive output from Rust
    let unlisten: UnlistenFn | null = null;
    listen<number[]>(`terminal-output-${sessionId}`, (event) => {
      const data = new Uint8Array(event.payload);
      terminal.write(data);

      // Update buffer for sudo detection (keep last 500 chars)
      const text = new TextDecoder().decode(data);
      setOutputBuffer((prev) => (prev + text).slice(-500));
    }).then((fn) => {
      unlisten = fn;
    });

    // Send input to Rust
    terminal.onData((data) => {
      invoke('send_terminal_input', { sessionId, data }).catch(console.error);
    });

    // Handle terminal exit
    const unlistenExit = listen<string>(`terminal-exit-${sessionId}`, () => {
      onExit?.();
    });

    return () => {
      unlisten?.();
      unlistenExit.then((fn) => fn());
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, [sessionId, onExit]);

  return (
    <>
      <div
        className={`rounded-lg overflow-hidden border transition-all duration-200
          ${isFocused ? 'border-cyan-500' : 'border-gray-700'}
          ${isExpanded ? 'h-[60vh]' : 'h-64'}`}
        onClick={() => terminalRef.current?.focus()}
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800">
          <span className="text-xs font-mono text-gray-400">
            🖥️ LIVE TERMINAL
          </span>
          <div className="flex items-center gap-2">
            {isFocused && (
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 rounded">
                FOCUSED
              </span>
            )}
            <span className="text-xs text-gray-500">⌘T to toggle</span>
          </div>
        </div>
        <div ref={containerRef} className="h-[calc(100%-28px)]" />
      </div>

      {needsPassword && (
        <SudoPrompt
          prompt={prompt}
          onSubmit={(password) => {
            invoke('send_terminal_input', { sessionId, data: password }).catch(
              console.error,
            );
            setOutputBuffer(''); // Clear buffer to dismiss prompt
          }}
          onCancel={() => {
            // Send Ctrl+C to cancel command
            invoke('send_terminal_input', { sessionId, data: '\x03' }).catch(
              console.error,
            );
            setOutputBuffer('');
          }}
        />
      )}
    </>
  );
}
