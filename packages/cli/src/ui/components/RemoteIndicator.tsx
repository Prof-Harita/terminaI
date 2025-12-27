/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';

type RemoteIndicatorProps = {
  host: string;
  port: number;
  loopback: boolean;
};

export const RemoteIndicator = ({
  host,
  port,
  loopback,
}: RemoteIndicatorProps) => (
  <Box
    borderStyle="round"
    borderColor={theme.status.warning}
    paddingX={1}
    flexDirection="column"
  >
    <Text color={theme.status.warning} bold>
      REMOTE ACTIVE
    </Text>
    <Text color={theme.status.warning}>
      {host}:{port} ({loopback ? 'loopback' : 'non-loopback'})
    </Text>
  </Box>
);
