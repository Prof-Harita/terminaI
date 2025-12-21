/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// React imported implicitly via JSX transform
import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { VoiceOrb } from './VoiceOrb.js';
import { VoiceStateContext } from '../contexts/VoiceContext.js';

describe('VoiceOrb', () => {
  it('renders state when voice is enabled', () => {
    const { lastFrame } = render(
      <VoiceStateContext.Provider
        value={{ enabled: true, state: 'LISTENING', amplitude: 0.6 }}
      >
        <VoiceOrb />
      </VoiceStateContext.Provider>,
    );
    expect(lastFrame()).toContain('listening');
  });

  it('hides when voice is disabled', () => {
    const { lastFrame } = render(
      <VoiceStateContext.Provider
        value={{ enabled: false, state: 'IDLE', amplitude: 0 }}
      >
        <VoiceOrb />
      </VoiceStateContext.Provider>,
    );
    expect(lastFrame()).toBe('');
  });
});
