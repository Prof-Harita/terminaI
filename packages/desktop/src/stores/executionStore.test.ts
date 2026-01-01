/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useExecutionStore } from './executionStore';

describe('useExecutionStore', () => {
  beforeEach(() => {
    useExecutionStore.getState().clearEvents();
  });

  it('adds a tool event correctly', () => {
    const event = {
      id: 'test-1',
      toolName: 'test-tool',
      inputArguments: {},
      status: 'running' as const,
      terminalOutput: '',
      startedAt: Date.now(),
    };

    useExecutionStore.getState().addToolEvent(event);
    expect(useExecutionStore.getState().toolEvents).toHaveLength(1);
    expect(useExecutionStore.getState().toolEvents[0].id).toBe('test-1');
  });

  it('appends terminal output', () => {
    const event = {
      id: 'test-1',
      toolName: 'test-tool',
      inputArguments: {},
      status: 'running' as const,
      terminalOutput: 'first ',
      startedAt: Date.now(),
    };

    useExecutionStore.getState().addToolEvent(event);
    useExecutionStore.getState().appendTerminalOutput('test-1', 'second');

    expect(useExecutionStore.getState().toolEvents[0].terminalOutput).toBe(
      'first second',
    );
  });

  it('manages waiting for input state', () => {
    useExecutionStore.getState().setWaitingForInput(true);
    expect(useExecutionStore.getState().isWaitingForInput).toBe(true);

    useExecutionStore.getState().setWaitingForInput(false);
    expect(useExecutionStore.getState().isWaitingForInput).toBe(false);
  });
});
