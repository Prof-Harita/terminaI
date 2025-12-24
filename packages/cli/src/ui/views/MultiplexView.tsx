/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { useUIState } from '../contexts/UIStateContext.js';

interface MultiplexViewProps {
  leftPane?: React.ReactNode;
  rightPane?: React.ReactNode;
}

export const MultiplexView: React.FC<MultiplexViewProps> = ({
  leftPane,
  rightPane,
}) => {
  const { terminalWidth, terminalHeight } = useUIState();

  // Determine split direction based on width
  // columns > 140: Left (60%) / Right (40%) split
  // columns <= 140: Top (70%) / Bottom (30%) split
  const isWide = terminalWidth > 140;

  const flexDirection = isWide ? 'row' : 'column';

  return (
    <Box
      width={terminalWidth}
      height={terminalHeight - 2} // Account for header/footer approx
      flexDirection={flexDirection}
    >
      <Box
        width={isWide ? '60%' : '100%'}
        height={isWide ? '100%' : '70%'}
        borderStyle="single"
        borderColor="blue" // Temporary visualization
      >
        {leftPane || <Text>Agent Pane (Left/Top)</Text>}
      </Box>
      <Box
        width={isWide ? '40%' : '100%'}
        height={isWide ? '100%' : '30%'}
        borderStyle="single"
        borderColor="green" // Temporary visualization
      >
        {rightPane || <Text>Process Pane (Right/Bottom)</Text>}
      </Box>
    </Box>
  );
};
