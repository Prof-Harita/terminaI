/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type OutputType = 'text' | 'tui' | 'progress';

// ANSI escape sequences that indicate TUI/full-screen mode
const TUI_INDICATORS = [
  '\x1b[?1049h', // Alternate screen buffer (enter)
  '\x1b[?1h', // Application cursor keys
  '\x1b[?25l', // Hide cursor
  '\x1b[2J', // Clear entire screen
  '\x1b[H\x1b[J', // Move to home and clear
];

// Patterns for progress bars
const PROGRESS_PATTERNS = [
  /\[[#=]+[>\s=-]*\]/, // [====>   ], [###   ]
  /\d+%/, // 50%
  /\(\d+\/\d+\)/, // (1/5)
  /███+/, // Block characters
  /⣿+/, // Braille progress
];

export function detectOutputType(data: string): OutputType {
  // Check for TUI indicators
  for (const indicator of TUI_INDICATORS) {
    if (data.includes(indicator)) {
      return 'tui';
    }
  }

  // Check for progress patterns
  for (const pattern of PROGRESS_PATTERNS) {
    if (pattern.test(data)) {
      return 'progress';
    }
  }

  return 'text';
}

// Check if output indicates the TUI has exited
export function detectTuiExit(data: string): boolean {
  return data.includes('\x1b[?1049l'); // Alternate screen buffer (exit)
}
