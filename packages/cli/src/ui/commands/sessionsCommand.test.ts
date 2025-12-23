/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { sessionsCommand } from './sessionsCommand.js';
import { PROCESS_MANAGER_TOOL_NAME } from '@google/gemini-cli-core';
import type { CommandContext } from './types.js';

describe('sessionsCommand', () => {
  it('returns usage when no subcommand is provided', () => {
    const result = sessionsCommand.action!({} as CommandContext, '');
    expect(result).toMatchObject({
      type: 'message',
      messageType: 'error',
    });
  });

  it('returns tool action for list', () => {
    const result = sessionsCommand.action!({} as CommandContext, 'list');
    expect(result).toEqual({
      type: 'tool',
      toolName: PROCESS_MANAGER_TOOL_NAME,
      toolArgs: { operation: 'list' },
    });
  });

  it('builds start tool args with background', () => {
    const result = sessionsCommand.action!(
      {} as CommandContext,
      'start dev "npm run dev"',
    );
    expect(result).toEqual({
      type: 'tool',
      toolName: PROCESS_MANAGER_TOOL_NAME,
      toolArgs: {
        operation: 'start',
        name: 'dev',
        command: 'npm run dev',
        background: true,
      },
    });
  });

  it('supports summarize with optional lines', () => {
    const result = sessionsCommand.action!(
      {} as CommandContext,
      'summarize dev 25',
    );
    expect(result).toEqual({
      type: 'tool',
      toolName: PROCESS_MANAGER_TOOL_NAME,
      toolArgs: {
        operation: 'summarize',
        name: 'dev',
        lines: 25,
      },
    });
  });
});
