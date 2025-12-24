/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, type ReactNode } from 'react';
import { THEME, type Theme } from '../kit/Theme.js';

const ThemeContext = createContext<Theme>(THEME);

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeContext.Provider value={THEME}>{children}</ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);
