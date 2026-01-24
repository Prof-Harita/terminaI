/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrokerClient } from './BrokerClient.js';

function getArgValue(prefix: string): string | undefined {
  const arg = process.argv.find((item) => item.startsWith(prefix));
  if (!arg) return undefined;
  const [, value] = arg.split('=');
  return value;
}

async function main(): Promise<void> {
  const pipePath = process.env['TERMINAI_BROKER_PIPE'] ?? getArgValue('--pipe');
  const token = process.env['TERMINAI_HANDSHAKE_TOKEN'];
  const clientVersion = process.env['TERMINAI_CLI_VERSION'];

  if (!pipePath) {
    throw new Error('Missing broker pipe path');
  }
  if (!token) {
    throw new Error('Missing handshake token');
  }

  const client = new BrokerClient({
    pipePath,
    handshakeToken: token,
    clientVersion,
    autoReconnect: true,
  });

  await client.connect();

  const shutdown = async () => {
    try {
      await client.disconnect();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error('[agent-brain] Fatal error:', error);
  process.exit(1);
});
