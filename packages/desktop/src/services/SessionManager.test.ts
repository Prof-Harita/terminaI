/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionManager } from './SessionManager';
import { useBridgeStore } from '../bridge/store';
import { useExecutionStore } from '../stores/executionStore';
import { commandRegistry } from '../commands/registry';
import { ClearCommand } from '../commands/implementations/ClearCommand';
import { RestoreCommand } from '../commands/implementations/RestoreCommand';
import type { CommandContext } from '../commands/types';

// Mock stores
vi.mock('../bridge/store', () => ({
  useBridgeStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

vi.mock('../stores/executionStore', () => ({
  useExecutionStore: {
    getState: vi.fn(),
  },
}));

describe('Session Command Architecture', () => {
  const mockDispatch = vi.fn();
  const mockSetCurrentConversationId = vi.fn();
  const mockClearEvents = vi.fn();
  const mockUI = {
    clearMessages: vi.fn(),
    focusInput: vi.fn(),
    appendSystemMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Store Mocks
    vi.mocked(useBridgeStore.getState).mockReturnValue({
      dispatch: mockDispatch,
      setCurrentConversationId: mockSetCurrentConversationId,
      state: { status: 'connected' },
    } as unknown as ReturnType<typeof useBridgeStore.getState>);

    vi.mocked(useExecutionStore.getState).mockReturnValue({
      clearEvents: mockClearEvents,
    } as unknown as ReturnType<typeof useExecutionStore.getState>);

    // Register command if not present (although registry is singleton)
    if (!commandRegistry.has('clear')) {
      commandRegistry.register(ClearCommand);
    }
  });

  describe('SessionManager', () => {
    it('startNewSession should trigger abort, reset ID, and clear execution', () => {
      SessionManager.startNewSession();

      // 1. Signal Abort (Disconnect)
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DISCONNECTED',
          reason: 'Session Reset',
        }),
      );

      // 2. Generate New ID
      expect(mockSetCurrentConversationId).toHaveBeenCalledWith(
        expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
      );

      // 3. Clear Execution State
      expect(mockClearEvents).toHaveBeenCalled();
    });

    it('resumeSession should trigger disconnect (switch), set ID, and clear execution', () => {
      const targetId = 'uuid-to-restore';
      SessionManager.resumeSession(targetId);

      // 1. Signal Disconnect (Switch)
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DISCONNECTED',
          reason: 'Session Switched',
        }),
      );

      // 2. Set Target ID
      expect(mockSetCurrentConversationId).toHaveBeenCalledWith(targetId);

      // 3. Clear Execution State
      expect(mockClearEvents).toHaveBeenCalled();
    });
  });

  describe('CommandRegistry & ClearCommand', () => {
    it('should parse "/clear"', () => {
      const match = commandRegistry.parse('/clear');
      expect(match).toEqual({ command: 'clear', args: [] });
    });

    it('should execute ClearCommand and trigger SessionManager', async () => {
      const context: CommandContext = {
        dispatch: mockDispatch,
        store: { status: 'connected' } as CommandContext['store'],
        ui: mockUI,
      };

      await commandRegistry.execute('clear', [], context);

      // SessionManager effects
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DISCONNECTED',
          reason: 'Session Reset',
        }),
      );
      expect(mockSetCurrentConversationId).toHaveBeenCalled();

      // UI effects
      expect(mockUI.clearMessages).toHaveBeenCalled();
      expect(mockUI.appendSystemMessage).toHaveBeenCalledWith(
        expect.stringContaining('Session cleared'),
      );
    });

    it('should parse "/restore uuid"', () => {
      const match = commandRegistry.parse('/restore 123-abc');
      expect(match).toEqual({ command: 'restore', args: ['123-abc'] });
    });

    it('should execute RestoreCommand', async () => {
      const context: CommandContext = {
        dispatch: mockDispatch,
        store: { status: 'connected' } as CommandContext['store'],
        ui: mockUI,
      };

      // Ensure registered
      commandRegistry.register(RestoreCommand);

      await commandRegistry.execute('restore', ['new-id'], context);

      expect(mockSetCurrentConversationId).toHaveBeenCalledWith('new-id');
      expect(mockUI.appendSystemMessage).toHaveBeenCalledWith(
        expect.stringContaining('Resumed session'),
      );
    });
  });
});
