/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeToStdout } from '@terminai/core';

/**
 * Session separator constants
 */
const BRAND_COLOR = '\x1b[38;2;226;35;26m'; // #E2231A (TerminaI red)
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

/**
 * Prints a visual separator marking the start of a TerminaI session.
 * Only called when NOT using alternate buffer (scrollback mode).
 *
 * Design: Full-width bar with timestamp
 * ══════════ terminaI │ 08:34:15 ═══════════
 *
 * @param terminalWidth - The width of the terminal in columns
 */
export function printSessionSeparator(terminalWidth: number = 80): void {
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Brand name: terminaI (small 't', capital 'I')
  const brandName = 'terminaI';
  const divider = ' │ ';
  const centerContent = ` ${brandName}${divider}${timestamp} `;

  // Calculate padding for centering
  const contentLength = centerContent.length;
  const availableWidth = Math.max(terminalWidth - 2, contentLength + 4);
  const leftPadding = Math.floor((availableWidth - contentLength) / 2);
  const rightPadding = availableWidth - contentLength - leftPadding;

  // Build the separator line using box-drawing characters
  const leftBar = '═'.repeat(Math.max(leftPadding, 3));
  const rightBar = '═'.repeat(Math.max(rightPadding, 3));

  // Construct the full separator with color
  const separator = `\n${DIM}${leftBar}${RESET}${BOLD}${BRAND_COLOR}${centerContent}${RESET}${DIM}${rightBar}${RESET}\n\n`;

  writeToStdout(separator);
}
