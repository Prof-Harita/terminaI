/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { computerSessionManager, type ReplSession } from '@terminai/core';

interface ReplOutputPaneProps {
  /** Height of the pane */
  height?: number | string;
  /** Width of the pane */
  width?: number | string;
}

interface SessionState {
  name: string;
  language: ReplSession['language'];
  output: string[];
  isActive: boolean;
}

/**
 * ReplOutputPane displays the output from active REPL sessions
 * and allows user interaction via keyboard shortcuts.
 */
export const ReplOutputPane: React.FC<ReplOutputPaneProps> = ({
  height = '100%',
  width = '100%',
}) => {
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);

  // Poll for session updates (since ComputerSessionManager doesn't have events)
  useEffect(() => {
    const updateSessions = () => {
      const currentSessions = computerSessionManager.listSessions();
      setSessions(
        currentSessions.map((s, idx) => ({
          name: s.name,
          language: s.language,
          output: s.outputBuffer.slice(-50), // Keep last 50 lines
          isActive: idx === activeSessionIndex,
        })),
      );
    };

    // Initial update
    updateSessions();

    // Poll every 500ms for updates
    const interval = setInterval(updateSessions, 500);
    return () => clearInterval(interval);
  }, [activeSessionIndex]);

  // Handle keyboard shortcuts
  useInput(
    useCallback(
      (input, key) => {
        const currentSessionName = sessions[activeSessionIndex]?.name;

        // Ctrl+C: Send SIGINT to active session
        if (key.ctrl && input === 'c') {
          if (currentSessionName) {
            computerSessionManager.killSession(currentSessionName, 'SIGINT');
          }
          return;
        }

        // Tab: Cycle through sessions
        if (key.tab) {
          setActiveSessionIndex((prev) =>
            sessions.length > 0 ? (prev + 1) % sessions.length : 0,
          );
          return;
        }

        // Ctrl+K: Kill active session
        if (key.ctrl && input === 'k') {
          if (currentSessionName) {
            computerSessionManager.killSession(currentSessionName, 'SIGKILL');
          }
          return;
        }
      },
      [sessions, activeSessionIndex],
    ),
  );

  const activeSession = sessions[activeSessionIndex];

  if (sessions.length === 0) {
    return (
      <Box
        height={height}
        width={width}
        flexDirection="column"
        padding={1}
        borderStyle="round"
        borderColor="gray"
      >
        <Text dimColor>No active REPL sessions</Text>
        <Text dimColor italic>
          Use execute_repl to start a session
        </Text>
      </Box>
    );
  }

  return (
    <Box height={height} width={width} flexDirection="column">
      {/* Session tabs */}
      <Box flexDirection="row" marginBottom={1}>
        {sessions.map((session, idx) => (
          <Box
            key={session.name}
            marginRight={1}
            paddingX={1}
            borderStyle={idx === activeSessionIndex ? 'bold' : 'single'}
            borderColor={idx === activeSessionIndex ? 'cyan' : 'gray'}
          >
            <Text
              color={idx === activeSessionIndex ? 'cyan' : 'white'}
              bold={idx === activeSessionIndex}
            >
              {session.language}:{session.name.slice(0, 10)}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Output area */}
      <Box
        flexGrow={1}
        flexDirection="column"
        borderStyle="single"
        borderColor="blue"
        paddingX={1}
        overflowY="hidden"
      >
        {activeSession?.output.map((line, idx) => (
          <Text key={idx} wrap="truncate-end">
            {line}
          </Text>
        ))}
      </Box>

      {/* Status bar */}
      <Box flexDirection="row" marginTop={1}>
        <Text dimColor>
          [Tab] Switch session • [Ctrl+C] Interrupt • [Ctrl+K] Kill session
        </Text>
      </Box>
    </Box>
  );
};
