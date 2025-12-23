/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '../../test-utils/render.js';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Header } from './Header.js';
import * as useTerminalSize from '../hooks/useTerminalSize.js';
import {
  logoBody,
  logoCursor,
  logoBodyLarge,
  logoCursorLarge,
} from './AsciiArt.js';
import { Text } from 'ink';

vi.mock('../hooks/useTerminalSize.js');
vi.mock('ink', async () => {
  const originalInk = await vi.importActual<typeof import('ink')>('ink');
  return {
    ...originalInk,
    Text: vi.fn(originalInk.Text),
  };
});

describe('<Header />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the split logo (body + cursor) with colors on a wide terminal', () => {
    vi.spyOn(useTerminalSize, 'useTerminalSize').mockReturnValue({
      columns: 120,
      rows: 20,
    });
    render(<Header version="1.0.0" nightly={false} />);
    const textCalls = (Text as Mock).mock.calls;
    expect(textCalls.length).toBe(2);
    expect(textCalls[0][0]).toMatchObject({
      children: logoBodyLarge,
      color: 'white',
    });
    expect(textCalls[1][0]).toMatchObject({
      children: logoCursorLarge,
      color: 'red',
      bold: true,
    });
  });

  it('renders the small logo when the terminal is narrow', () => {
    vi.spyOn(useTerminalSize, 'useTerminalSize').mockReturnValue({
      columns: 20,
      rows: 20,
    });
    render(<Header version="1.0.0" nightly={false} />);
    const textCalls = (Text as Mock).mock.calls;
    expect(textCalls.length).toBe(2);
    expect(textCalls[0][0]).toMatchObject({
      children: logoBody,
      color: 'white',
    });
    expect(textCalls[1][0]).toMatchObject({
      children: logoCursor,
      color: 'red',
      bold: true,
    });
  });

  it('renders custom ASCII art when provided', () => {
    const customArt = 'CUSTOM ART';
    const { lastFrame } = render(
      <Header version="1.0.0" nightly={false} customAsciiArt={customArt} />,
    );
    expect(lastFrame()).toContain(customArt);
  });

  it('displays the version number when nightly is true', () => {
    const { lastFrame } = render(<Header version="1.0.0" nightly={true} />);
    expect(lastFrame()).toContain('v1.0.0');
  });

  it('does not display the version number when nightly is false', () => {
    const { lastFrame } = render(<Header version="1.0.0" nightly={false} />);
    expect(lastFrame()).not.toContain('v1.0.0');
  });
});
