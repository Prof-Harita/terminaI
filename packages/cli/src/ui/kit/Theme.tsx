/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

// Industrial Minimalist Palette
export const COLORS = {
  black: '#000000',
  panel: '#111111',
  white: '#FFFFFF',
  grey: '#666666',
  red: '#E2231A',
  orange: '#FF5722', // Gradient end for red
  dimBorder: '#333333',
  activeBorder: '#FFFFFF',
};

export const THEME = {
  background: COLORS.black,
  panelBackground: COLORS.panel,
  foreground: COLORS.white,
  muted: COLORS.grey,
  accent: COLORS.red,
  border: {
    dim: COLORS.dimBorder,
    active: COLORS.activeBorder,
  },
  gradient: [COLORS.red, COLORS.orange],
};

export type Theme = typeof THEME;
