/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Theme, type ColorsTheme } from './theme.js';
import { interpolateColor } from './color-utils.js';

const termaiLightColors: ColorsTheme = {
  type: 'light',
  Background: '#FAFAFA',
  Foreground: '#212121',
  LightBlue: '#039BE5',
  AccentBlue: '#2962FF',
  AccentPurple: '#6200EA',
  AccentCyan: '#00B8D4',
  AccentGreen: '#00C853', // Vivid Green
  AccentYellow: '#FFD600',
  AccentRed: '#D50000',
  DiffAdded: '#C8E6C9',
  DiffRemoved: '#FFCDD2',
  Comment: '#757575',
  Gray: '#9E9E9E',
  DarkGray: interpolateColor('#9E9E9E', '#FAFAFA', 0.5),
  GradientColors: ['#00C853', '#2962FF', '#6200EA'], // Green -> Blue -> Purple
};

export const TermAILight: Theme = new Theme(
  'TerminaI Light',
  'light',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: termaiLightColors.Background,
      color: termaiLightColors.Foreground,
    },
    'hljs-comment': {
      color: termaiLightColors.Comment,
    },
    'hljs-quote': {
      color: termaiLightColors.Comment,
    },
    'hljs-variable': {
      color: termaiLightColors.Foreground,
    },
    'hljs-keyword': {
      color: termaiLightColors.AccentGreen,
    },
    'hljs-selector-tag': {
      color: termaiLightColors.AccentGreen,
    },
    'hljs-built_in': {
      color: termaiLightColors.AccentBlue,
    },
    'hljs-name': {
      color: termaiLightColors.AccentBlue,
    },
    'hljs-tag': {
      color: termaiLightColors.AccentBlue,
    },
    'hljs-string': {
      color: termaiLightColors.AccentRed, // Keeps readability high on light bg
    },
    'hljs-title': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-section': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-attribute': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-literal': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-template-tag': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-template-variable': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-type': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-addition': {
      color: termaiLightColors.AccentGreen,
    },
    'hljs-deletion': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-selector-attr': {
      color: termaiLightColors.AccentCyan,
    },
    'hljs-selector-pseudo': {
      color: termaiLightColors.AccentCyan,
    },
    'hljs-meta': {
      color: termaiLightColors.AccentCyan,
    },
    'hljs-doctag': {
      color: termaiLightColors.Gray,
    },
    'hljs-attr': {
      color: termaiLightColors.AccentRed,
    },
    'hljs-symbol': {
      color: termaiLightColors.AccentCyan,
    },
    'hljs-bullet': {
      color: termaiLightColors.AccentCyan,
    },
    'hljs-link': {
      color: termaiLightColors.AccentCyan,
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
  },
  termaiLightColors,
);
