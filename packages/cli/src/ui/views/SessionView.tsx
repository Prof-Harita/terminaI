/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { MainContent } from '../components/MainContent.js';

// Currently, SessionView is primarily a wrapper around MainContent to provide
// a specific "view" component that aligns with the viewMode architecture.
// In the future, logic specific to the active session layout can be moved here
// from AppContainer or MainContent.

export const SessionView: React.FC = () => <MainContent />;
