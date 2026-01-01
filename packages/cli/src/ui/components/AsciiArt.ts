/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

// Spaced out sans-serif style matching the slick ThinkPad aesthetic
// The "I" is separated so it can be styled red/blinking in Header.tsx

// Double spaced for better presence (~15-20 chars width) and "wide enough" look
export const logoBody = `t  e  r  m  i  n  a`;
export const logoCursor = `I`;

// Use the same sleek strings for all sizes
// The user explicitly rejected block art ("looks like shit")
export const logoBodyLarge = logoBody;
export const logoCursorLarge = logoCursor;

// Legacy exports to satisfy tests
export const shortAsciiLogo = logoBody + logoCursor;
export const longAsciiLogo = logoBody + logoCursor;
export const tinyAsciiLogo = logoBody + logoCursor;
export const shortAsciiLogoIde = logoBody + logoCursor;
export const longAsciiLogoIde = logoBody + logoCursor;
export const tinyAsciiLogoIde = logoBody + logoCursor;
