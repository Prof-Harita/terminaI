/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Composer } from '../components/Composer.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { theme } from '../semantic-colors.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { RemoteIndicator } from '../components/RemoteIndicator.js';

// Large ASCII art logo - "DOS Rebel" style (Exact user request)
// 'termina' (lowercase)
const LOGO_BODY = `
  █████                                        ███                      
 ░░███                                        ░░░                       
 ███████    ██████  ████████  █████████████   ████  ████████    ██████  
░░░███░    ███░░███░░███░░███░░███░░███░░███ ░░███ ░░███░░███  ░░░░░███ 
  ░███    ░███████  ░███ ░░░  ░███ ░███ ░███  ░███  ░███ ░███   ███████ 
  ░███ ███░███░░░   ░███      ░███ ░███ ░███  ░███  ░███ ░███  ███░░███ 
  ░░█████ ░░██████  █████     █████░███ █████ █████ ████ █████░░████████
   ░░░░░   ░░░░░░  ░░░░░     ░░░░░ ░░░ ░░░░░ ░░░░░ ░░░░ ░░░░░  ░░░░░░░░`.slice(
  1,
);

// 'I' (Solid Block Cursor)
const LOGO_I = `
  █████
  █████ 
  █████ 
  █████ 
  █████ 
  █████ 
  █████
  █████`.slice(1);

/**
 * ZenView - Full-screen centered layout for startup/login
 * Inspired by OpenCode's clean, minimal home screen
 */
export const ZenView = () => {
  const { terminalHeight, mainAreaWidth, terminalWidth } = useUIState();
  const config = useConfig();
  const [blink, setBlink] = useState(true);
  const webRemoteStatus = config.getWebRemoteStatus();

  useEffect(() => {
    const timer = setInterval(() => {
      setBlink((b) => !b);
    }, 530);
    return () => clearInterval(timer);
  }, []);

  // Calculate vertical centering
  const logoHeight = 8; // Logo is 6 lines + margins
  const inputHeight = 5;
  const hintsHeight = 2;
  const contentHeight = logoHeight + inputHeight + hintsHeight;
  const topPadding = Math.max(
    0,
    Math.floor((terminalHeight - contentHeight) / 2) - 3,
  );

  // Check if terminal is wide enough for full logo
  const logoWidth = 70;
  const useSmallLogo = terminalWidth < logoWidth + 10;

  return (
    <Box
      flexDirection="column"
      width="100%"
      height={terminalHeight - 2}
      paddingTop={topPadding}
      alignItems="center"
    >
      {/* Centered Logo */}
      {useSmallLogo ? (
        // Fallback to simple text for narrow terminals
        <Box flexDirection="row" justifyContent="center" marginBottom={3}>
          <Text color={theme.text.primary} bold>
            t e r m i n a
          </Text>
          <Text color="#E2231A" bold dimColor={!blink}>
            I
          </Text>
        </Box>
      ) : (
        // Large ASCII art logo
        <Box flexDirection="row" justifyContent="center" marginBottom={3}>
          <Text color={theme.text.primary}>{LOGO_BODY}</Text>
          <Text color="#E2231A" bold dimColor={!blink}>
            {LOGO_I}
          </Text>
        </Box>
      )}

      {webRemoteStatus?.active && (
        <Box
          width={Math.min(80, mainAreaWidth)}
          justifyContent="center"
          marginBottom={2}
        >
          <RemoteIndicator
            host={webRemoteStatus.host}
            port={webRemoteStatus.port}
            loopback={webRemoteStatus.loopback}
          />
        </Box>
      )}

      {/* Centered Input */}
      <Box width={Math.min(80, mainAreaWidth)} justifyContent="center">
        <Composer />
      </Box>

      {/* Spacer to push hints toward bottom */}
      <Box flexGrow={1} />

      {/* Bottom hints */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color={theme.ui.comment} dimColor>
          ctrl+k commands
        </Text>
      </Box>
    </Box>
  );
};
