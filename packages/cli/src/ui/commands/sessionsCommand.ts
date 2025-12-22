/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type SlashCommand,
  type CommandContext,
  CommandKind,
} from './types.js';
import { PROCESS_MANAGER_TOOL_NAME } from '@google/gemini-cli-core';

const parseArgs = (argString: string): string[] => {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(argString)) !== null) {
    const [, dbl, sgl, bare] = match;
    tokens.push(dbl ?? sgl ?? bare ?? '');
  }
  return tokens;
};

const usage =
  'Usage: /sessions <list|status|read|summarize|send|stop|start> [name] [...args]\n' +
  'Examples:\n' +
  '  /sessions list\n' +
  '  /sessions status devserver\n' +
  '  /sessions read devserver 50\n' +
  '  /sessions summarize devserver 100\n' +
  '  /sessions send devserver "rs\\n"\n' +
  '  /sessions stop devserver\n' +
  '  /sessions start devserver "npm run dev"\n';

export const sessionsCommand: SlashCommand = {
  name: 'sessions',
  description:
    'Manage background process sessions (start, list, status, read, summarize, send, stop).',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  action: (_context: CommandContext, rawArgs: string) => {
    const parts = parseArgs(rawArgs);
    const subcommand = parts.shift();

    if (!subcommand) {
      return {
        type: 'message',
        content: usage,
        messageType: 'error',
      };
    }

    const name = parts.shift();
    const lines = parts[0] ? Number.parseInt(parts[0], 10) : undefined;
    const remaining = parts.join(' ').trim();

    const buildError = (message: string) => ({
      type: 'message' as const,
      content: message,
      messageType: 'error' as const,
    });

    switch (subcommand) {
      case 'list':
        return {
          type: 'tool',
          toolName: PROCESS_MANAGER_TOOL_NAME,
          toolArgs: { operation: 'list' },
        };
      case 'status':
      case 'read':
      case 'summarize':
      case 'send':
      case 'stop':
        if (!name) {
          return buildError(`Session name required. ${usage}`);
        }
        if (subcommand === 'send' && !remaining) {
          return buildError('Text to send is required for /sessions send.');
        }
        return {
          type: 'tool',
          toolName: PROCESS_MANAGER_TOOL_NAME,
          toolArgs: {
            operation: subcommand === 'stop' ? 'stop' : subcommand,
            name,
            lines:
              subcommand === 'read' || subcommand === 'summarize'
                ? lines
                : undefined,
            text: subcommand === 'send' ? remaining : undefined,
          },
        };
      case 'start':
        if (!name || !remaining) {
          return buildError(`Session name and command are required. ${usage}`);
        }
        return {
          type: 'tool',
          toolName: PROCESS_MANAGER_TOOL_NAME,
          toolArgs: {
            operation: 'start',
            name,
            command: remaining,
            background: true,
          },
        };
      default:
        return {
          type: 'message',
          content: `Unknown subcommand "${subcommand}".\n${usage}`,
          messageType: 'error',
        };
    }
  },
};
