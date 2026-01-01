/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ThemedGradient } from './ThemedGradient.js';
import {
  logoBody,
  logoCursor,
  logoBodyLarge,
  logoCursorLarge,
} from './AsciiArt.js';
import { getAsciiArtWidth } from '../utils/textUtils.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface HeaderProps {
  customAsciiArt?: string; // For user-defined ASCII art
  version: string;
  nightly: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  customAsciiArt,
  version,
  nightly,
}) => {
  const { columns: terminalWidth } = useTerminalSize();

  // Determine which logo size to use based on terminal width
  // The large logo is roughly 30 chars wide
  const showLarge = terminalWidth >= 40;

  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setBlink((b) => !b);
    }, 530); // 530ms is a common cursor blink rate
    return () => clearInterval(timer);
  }, []);

  const body = showLarge ? logoBodyLarge : logoBody;
  const cursor = showLarge ? logoCursorLarge : logoCursor;

  // Calculate total width for container
  const artWidth = getAsciiArtWidth(body) + getAsciiArtWidth(cursor);

  if (customAsciiArt) {
    return (
      <Box
        alignItems="flex-start"
        width={getAsciiArtWidth(customAsciiArt)}
        flexShrink={0}
        flexDirection="column"
      >
        <ThemedGradient>{customAsciiArt}</ThemedGradient>
        {nightly && (
          <Box width="100%" flexDirection="row" justifyContent="flex-end">
            <ThemedGradient>v{version}</ThemedGradient>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      alignItems="flex-start"
      width={artWidth}
      flexShrink={0}
      flexDirection="column"
    >
      <Box flexDirection="row">
        {/* Main body: #FFFFFF */}
        <Text color="#FFFFFF">{body}</Text>
        {/* Cursor: #E2231A, blinking */}
        <Text color="#E2231A" dimColor={!blink}>
          {cursor}
        </Text>
      </Box>

      {nightly && (
        <Box width="100%" flexDirection="row" justifyContent="flex-end">
          <ThemedGradient>v{version}</ThemedGradient>
        </Box>
      )}
    </Box>
  );
};
