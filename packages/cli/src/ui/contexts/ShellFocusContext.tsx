/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';

export const ShellFocusContext = createContext<boolean>(true);

export const useShellFocusState = () => useContext(ShellFocusContext);
