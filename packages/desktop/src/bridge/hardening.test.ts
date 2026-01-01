/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TabLock } from './tabLock';
import { checkReconnection, validateCliInstance } from './reconnection';
import type { BridgeState } from './types';

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(_msg: unknown) {
    // No-op for unit test
  }

  close() {}
}

global.BroadcastChannel =
  MockBroadcastChannel as unknown as typeof BroadcastChannel;

describe('TabLock', () => {
  beforeEach(() => {
    // Stub navigator with undefined locks to force fallback mode
    vi.stubGlobal('navigator', { locks: undefined });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests leadership on instantiation (fallback mode)', () => {
    const lock = new TabLock('test-channel');
    expect(lock.isLocked()).toBe(true);
  });

  it('releases lock when release() is called', () => {
    const lock = new TabLock('test-channel-release');
    expect(lock.isLocked()).toBe(true);
    lock.release();
    expect(lock.isLocked()).toBe(false);
  });

  it('can be instantiated with custom channel name', () => {
    const lock = new TabLock('custom-bridge-lock');
    expect(lock.isLocked()).toBe(true);
  });
});

describe('Reconnection Detection', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkReconnection', () => {
    it('returns false when event has no result', () => {
      const state: BridgeState = { status: 'connected' };
      const result = checkReconnection({}, state, mockDispatch);
      expect(result).toBe(false);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('returns false when not in streaming state', () => {
      const state: BridgeState = { status: 'connected' };
      const result = checkReconnection(
        { result: { eventSeq: 0 } },
        state,
        mockDispatch,
      );
      expect(result).toBe(false);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('returns false when eventSeq is not 0', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 5,
      };
      const result = checkReconnection(
        { result: { eventSeq: 6 } },
        state,
        mockDispatch,
      );
      expect(result).toBe(false);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('detects CLI restart when eventSeq resets to 0', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 10,
      };
      const result = checkReconnection(
        { result: { eventSeq: 0 } },
        state,
        mockDispatch,
      );
      expect(result).toBe(true);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'RESET' });
    });

    it('does not trigger on first event (state eventSeq is 0)', () => {
      const state: BridgeState = {
        status: 'streaming',
        taskId: 't1',
        contextId: 'c1',
        eventSeq: 0,
      };
      const result = checkReconnection(
        { result: { eventSeq: 0 } },
        state,
        mockDispatch,
      );
      expect(result).toBe(false);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('validateCliInstance', () => {
    it('returns true when no expected instanceId', () => {
      expect(validateCliInstance(null, 'any-id')).toBe(true);
    });

    it('returns true when event has no instanceId (backward compat)', () => {
      expect(validateCliInstance('expected-id', undefined)).toBe(true);
    });

    it('returns true when instanceIds match', () => {
      expect(validateCliInstance('same-id', 'same-id')).toBe(true);
    });

    it('returns false when instanceIds mismatch', () => {
      expect(validateCliInstance('expected', 'different')).toBe(false);
    });
  });
});
