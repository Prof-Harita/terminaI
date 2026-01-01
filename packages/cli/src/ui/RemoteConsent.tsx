/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

export type RemoteConsentResult = {
  accepted: boolean;
};

type RemoteConsentProps = {
  host: string;
  port: number;
  loopback: boolean;
  onComplete: (result: RemoteConsentResult) => void;
};

export const RemoteConsent = ({
  host,
  port,
  loopback,
  onComplete,
}: RemoteConsentProps) => {
  const [accepted, setAccepted] = useState(false);

  useInput((_, key) => {
    if (key.return) {
      onComplete({ accepted });
      return;
    }
    if (
      key.leftArrow ||
      key.rightArrow ||
      key.upArrow ||
      key.downArrow ||
      key.tab
    ) {
      setAccepted((prev) => !prev);
    }
    if (key.escape) {
      onComplete({ accepted: false });
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      gap={1}
    >
      <Text color="yellow" bold>
        Remote Access Consent
      </Text>
      <Text>
        ELI5: This lets someone else use your keyboard. If they get the token,
        they can run commands, read files, and delete data.
      </Text>
      <Text>
        Only enable this if you trust the network and the people who will use
        it.
      </Text>
      <Text>
        Bind: {host}:{port} ({loopback ? 'loopback' : 'non-loopback'})
      </Text>
      <Box flexDirection="column">
        <Text color={accepted ? 'cyan' : 'gray'}>
          {accepted ? '> ' : '  '}Yes, enable remote access
        </Text>
        <Text color={!accepted ? 'cyan' : 'gray'}>
          {!accepted ? '> ' : '  '}No, keep it off
        </Text>
      </Box>
      <Text dimColor>Use arrows or Tab to switch. Press Enter to confirm.</Text>
    </Box>
  );
};
