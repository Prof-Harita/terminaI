/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { theme } from '../semantic-colors.js';
import { AnsiOutputText } from './AnsiOutput.js';
import type { AnsiOutput as AnsiOutputType } from '@google/gemini-cli-core';
import { ShellExecutionService } from '@google/gemini-cli-core';
import { keyToAnsi } from '../hooks/keyToAnsi.js';

export interface FullScreenTerminalViewProps {
  /** The PID of the active shell */
  ptyId: number;
  /** Terminal output to display */
  output: AnsiOutputType | string | null;
  /** Available terminal width */
  terminalWidth: number;
  /** Available terminal height */
  terminalHeight: number;
  /** Called when the fullscreen session ends */
  onExit: () => void;
}

/**
 * Full-screen terminal takeover view for TUI applications.
 * Takes over the entire terminal when apps like vim, nano, htop are running.
 * Passes all keystrokes directly to the PTY.
 */
export const FullScreenTerminalView: React.FC<FullScreenTerminalViewProps> = ({
  ptyId,
  output,
  terminalWidth,
  terminalHeight,
  onExit: _onExit,
}) => {
  useInput((input, key) => {
    if (!ptyId) return;

    // Build key object matching our keyToAnsi interface
    const keyObj = {
      name: key.upArrow
        ? 'up'
        : key.downArrow
          ? 'down'
          : key.leftArrow
            ? 'left'
            : key.rightArrow
              ? 'right'
              : key.return
                ? 'return'
                : key.escape
                  ? 'escape'
                  : key.backspace
                    ? 'backspace'
                    : key.delete
                      ? 'delete'
                      : key.tab
                        ? 'tab'
                        : input,
      ctrl: key.ctrl ?? false,
      meta: key.meta ?? false,
      shift: key.shift ?? false,
      option: false,
      sequence: input,
      paste: false,
      insertable: !key.ctrl && !key.meta && input.length > 0,
    };

    // Convert key to ANSI sequence and send to PTY
    const ansiSequence = keyToAnsi(keyObj);
    if (ansiSequence) {
      ShellExecutionService.writeToPty(ptyId, ansiSequence);
    }

    // Handle scrolling with Ctrl+Shift+Up/Down
    if (key.ctrl && key.shift) {
      if (key.upArrow) {
        ShellExecutionService.scrollPty(ptyId, -1);
      } else if (key.downArrow) {
        ShellExecutionService.scrollPty(ptyId, 1);
      }
    }
  });

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header bar */}
      <Box
        width="100%"
        paddingX={1}
        borderStyle="single"
        borderColor={theme.border.focused}
      >
        <Text bold color={theme.text.accent}>
          Interactive Mode
        </Text>
        <Box flexGrow={1} />
        <Text color={theme.text.secondary}>[Ctrl+C to exit]</Text>
      </Box>

      {/* Terminal output area */}
      <Box flexDirection="column" flexGrow={1}>
        {output && typeof output === 'string' ? (
          <Text>{output}</Text>
        ) : output && Array.isArray(output) ? (
          <AnsiOutputText
            data={output}
            availableTerminalHeight={terminalHeight - 1}
            width={terminalWidth}
          />
        ) : (
          <Text color={theme.text.secondary}>Waiting for output...</Text>
        )}
      </Box>
    </Box>
  );
};
