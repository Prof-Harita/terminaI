/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SpotlightDialog } from '../components/SpotlightDialog.js';

/**
 * Validates and renders active dialog overlays.
 * This component should be placed at the end of the root layout to ensure proper z-indexing.
 */
export const DialogLayer = () => (
  <>
    <SpotlightDialog />
  </>
);
