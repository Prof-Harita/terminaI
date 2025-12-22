/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useState, useCallback } from 'react';
import { theme } from '../semantic-colors.js';
import { ShellExecutionService } from '@google/gemini-cli-core';

export interface PasswordInputModalProps {
  /** The password prompt text to display */
  prompt: string;
  /** The PID of the shell awaiting the password */
  ptyId: number;
  /** Called when the user cancels the modal */
  onCancel: () => void;
  /** Called after password is submitted */
  onSubmit: () => void;
}

/**
 * A focused modal overlay for password input.
 * Auto-focuses so user can immediately type their password.
 * Sends the password to the PTY on Enter, followed by a newline.
 */
export const PasswordInputModal: React.FC<PasswordInputModalProps> = ({
  prompt,
  ptyId,
  onCancel,
  onSubmit,
}) => {
  const [password, setPassword] = useState('');
  const [maskChar] = useState('●');

  const handleSubmit = useCallback(() => {
    // Send password + newline to the shell
    ShellExecutionService.writeToPty(ptyId, password + '\n');
    setPassword('');
    onSubmit();
  }, [password, ptyId, onSubmit]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      handleSubmit();
      return;
    }

    if (key.backspace || key.delete) {
      setPassword((prev) => prev.slice(0, -1));
      return;
    }

    // Only accept printable characters
    if (input && !key.ctrl && !key.meta) {
      setPassword((prev) => prev + input);
    }
  });

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border.focused}
        paddingX={2}
        paddingY={1}
        width={50}
      >
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold color={theme.text.accent}>
            🔒 Password Required
          </Text>
        </Box>

        {/* Prompt text */}
        <Box marginBottom={1}>
          <Text color={theme.text.primary}>{prompt}</Text>
        </Box>

        {/* Password input field */}
        <Box
          borderStyle="single"
          borderColor={theme.border.default}
          paddingX={1}
          marginBottom={1}
        >
          <Text color={theme.text.primary}>
            {password.length > 0 ? maskChar.repeat(password.length) : ' '}
          </Text>
          <Text color={theme.text.accent}>▌</Text>
        </Box>

        {/* Instructions */}
        <Box>
          <Text color={theme.text.secondary}>[Enter] Submit [Esc] Cancel</Text>
        </Box>
      </Box>
    </Box>
  );
};
