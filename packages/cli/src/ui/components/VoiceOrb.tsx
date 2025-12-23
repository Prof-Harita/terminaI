/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useVoiceState } from '../contexts/VoiceContext.js';

type StateVisual = {
  icon: string;
  color: string;
  label: string;
};

const STATE_VISUALS: Record<string, StateVisual> = {
  IDLE: { icon: '○', color: 'gray', label: 'voice active' },
  LISTENING: { icon: '●', color: 'red', label: 'paused' },
  PROCESSING: { icon: '◐', color: 'yellow', label: 'thinking' },
  SPEAKING: { icon: '◉', color: 'cyan', label: 'speaking' },
  DUCKING: { icon: '◎', color: 'blue', label: 'holding for you' },
  INTERRUPTED: { icon: '⊙', color: 'magenta', label: 'go ahead' },
};

function getPulse(amplitude: number, state: string): string {
  if (state !== 'LISTENING' && state !== 'SPEAKING' && state !== 'DUCKING') {
    return '';
  }
  const clamped = Math.max(0, Math.min(1, amplitude));
  const size = Math.max(0, Math.min(2, Math.round(clamped * 3)));
  return '░▒▓'.slice(0, size);
}

export const VoiceOrb: React.FC = () => {
  const { enabled, state, amplitude } = useVoiceState();
  const visual = useMemo<StateVisual>(
    () => STATE_VISUALS[state] || STATE_VISUALS['IDLE'],
    [state],
  );

  if (!enabled) {
    return null;
  }

  const pulse = getPulse(amplitude, state);

  return (
    <Box
      flexDirection="row"
      justifyContent="flex-end"
      alignItems="center"
      paddingX={1}
      height={1}
    >
      <Text color={visual.color} bold>
        {pulse}
        {visual.icon}
        {pulse}
      </Text>
      <Text dimColor>{` ${visual.label}`}</Text>
    </Box>
  );
};
