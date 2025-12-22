/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// React imported implicitly via JSX transform
import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react-dom/test-utils';
import { VoiceOrb } from './VoiceOrb.js';
import { VoiceStateContext } from '../contexts/VoiceContext.js';

describe('VoiceOrb', () => {
  it('renders state when voice is enabled', () => {
    let frame = '';
    act(() => {
      const { lastFrame, unmount } = render(
        <VoiceStateContext.Provider
          value={{ enabled: true, state: 'LISTENING', amplitude: 0.6 }}
        >
          <VoiceOrb />
        </VoiceStateContext.Provider>,
      );
      frame = lastFrame() ?? '';
      unmount();
    });
    expect(frame).toContain('paused');
  });

  it('hides when voice is disabled', () => {
    let frame = '';
    act(() => {
      const { lastFrame, unmount } = render(
        <VoiceStateContext.Provider
          value={{ enabled: false, state: 'IDLE', amplitude: 0 }}
        >
          <VoiceOrb />
        </VoiceStateContext.Provider>,
      );
      frame = lastFrame() ?? '';
      unmount();
    });
    expect(frame).toBe('');
  });
});
