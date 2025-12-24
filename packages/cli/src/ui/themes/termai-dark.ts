/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Theme, type ColorsTheme } from './theme.js';
import { interpolateColor } from './color-utils.js';

const termaiDarkColors: ColorsTheme = {
  type: 'dark',
  Background: '#121212', // Slightly darker than standard material dark
  Foreground: '#E0E0E0',
  LightBlue: '#4FC3F7',
  AccentBlue: '#2979FF',
  AccentPurple: '#B388FF',
  AccentCyan: '#00E5FF', // Neon Cyan
  AccentGreen: '#00E676', // Neon Green
  AccentYellow: '#FFEA00', // Neon Yellow
  AccentRed: '#FF1744', // Neon Red
  DiffAdded: '#1B5E20',
  DiffRemoved: '#B71C1C',
  Comment: '#757575',
  Gray: '#9E9E9E',
  DarkGray: interpolateColor('#9E9E9E', '#121212', 0.5),
  GradientColors: ['#00E676', '#2979FF', '#B388FF'], // Green -> Blue -> Purple
};

export const TermAIDark: Theme = new Theme(
  'TerminaI Dark',
  'dark',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: termaiDarkColors.Background,
      color: termaiDarkColors.Foreground,
    },
    'hljs-keyword': {
      color: termaiDarkColors.AccentGreen, // Keywords in green
    },
    'hljs-literal': {
      color: termaiDarkColors.AccentCyan,
    },
    'hljs-symbol': {
      color: termaiDarkColors.AccentCyan,
    },
    'hljs-name': {
      color: termaiDarkColors.AccentBlue,
    },
    'hljs-link': {
      color: termaiDarkColors.AccentBlue,
      textDecoration: 'underline',
    },
    'hljs-built_in': {
      color: termaiDarkColors.AccentCyan,
    },
    'hljs-type': {
      color: termaiDarkColors.AccentCyan,
    },
    'hljs-number': {
      color: termaiDarkColors.AccentPurple,
    },
    'hljs-class': {
      color: termaiDarkColors.AccentGreen,
    },
    'hljs-string': {
      color: termaiDarkColors.AccentYellow,
    },
    'hljs-meta-string': {
      color: termaiDarkColors.AccentYellow,
    },
    'hljs-regexp': {
      color: termaiDarkColors.AccentRed,
    },
    'hljs-template-tag': {
      color: termaiDarkColors.AccentRed,
    },
    'hljs-subst': {
      color: termaiDarkColors.Foreground,
    },
    'hljs-function': {
      color: termaiDarkColors.Foreground,
    },
    'hljs-title': {
      color: termaiDarkColors.Foreground,
    },
    'hljs-params': {
      color: termaiDarkColors.Foreground,
    },
    'hljs-formula': {
      color: termaiDarkColors.Foreground,
    },
    'hljs-comment': {
      color: termaiDarkColors.Comment,
      fontStyle: 'italic',
    },
    'hljs-quote': {
      color: termaiDarkColors.Comment,
      fontStyle: 'italic',
    },
    'hljs-doctag': {
      color: termaiDarkColors.Comment,
    },
    'hljs-meta': {
      color: termaiDarkColors.Gray,
    },
    'hljs-meta-keyword': {
      color: termaiDarkColors.Gray,
    },
    'hljs-tag': {
      color: termaiDarkColors.Gray,
    },
    'hljs-variable': {
      color: termaiDarkColors.AccentPurple,
    },
    'hljs-template-variable': {
      color: termaiDarkColors.AccentPurple,
    },
    'hljs-attr': {
      color: termaiDarkColors.LightBlue,
    },
    'hljs-attribute': {
      color: termaiDarkColors.LightBlue,
    },
    'hljs-builtin-name': {
      color: termaiDarkColors.LightBlue,
    },
    'hljs-section': {
      color: termaiDarkColors.AccentYellow,
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
    'hljs-bullet': {
      color: termaiDarkColors.AccentYellow,
    },
    'hljs-selector-tag': {
      color: termaiDarkColors.AccentGreen,
    },
    'hljs-selector-id': {
      color: termaiDarkColors.AccentYellow,
    },
    'hljs-selector-class': {
      color: termaiDarkColors.AccentYellow,
    },
    'hljs-selector-attr': {
      color: termaiDarkColors.AccentYellow,
    },
    'hljs-selector-pseudo': {
      color: termaiDarkColors.AccentYellow,
    },
    'hljs-addition': {
      backgroundColor: '#1b5e20', // manually matching DiffAdded
      display: 'inline-block',
      width: '100%',
    },
    'hljs-deletion': {
      backgroundColor: '#b71c1c', // manually matching DiffRemoved
      display: 'inline-block',
      width: '100%',
    },
  },
  termaiDarkColors,
);
