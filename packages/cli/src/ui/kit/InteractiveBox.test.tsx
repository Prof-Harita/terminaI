/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { InteractiveBox } from './InteractiveBox.js';
import { renderWithProviders } from '../../test-utils/render.js';
import { Text } from 'ink';
import { act } from 'react';

describe('InteractiveBox', () => {
  it('should render children', () => {
    const { lastFrame, unmount } = renderWithProviders(
      <InteractiveBox>
        <Text>Hello</Text>
      </InteractiveBox>,
    );
    expect(lastFrame()).toContain('Hello');
    unmount();
  });

  it('should handle clicks', async () => {
    const onClick = vi.fn();
    const { stdin, unmount } = renderWithProviders(
      <InteractiveBox onClick={onClick}>
        <Text>Click Me</Text>
      </InteractiveBox>,
      { mouseEventsEnabled: true },
    );

    // Simulate click (assuming component is at 0,0)
    // Terminal 1-based: col=1, row=1
    await act(async () => {
      stdin.write('\x1b[<0;1;1M'); // left button press
      stdin.write('\x1b[<0;1;1m'); // left button release
    });

    // InteractiveBox triggers on click (left-press currently in useMouseClick default)
    // Wait for internal logic if needed, but act() should flush it.
    // Note: useMouseClick usually triggers on 'left-press' or 'right-release'.
    // InteractiveBox wrapper sets simple onClick.

    expect(onClick).toHaveBeenCalled();
    unmount();
  });
});
