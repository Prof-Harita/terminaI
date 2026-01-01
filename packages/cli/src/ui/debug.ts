/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

// A top-level field to track the total number of active animated components.
// This is used for testing to ensure we wait for animations to finish.
export const debugState = {
  debugNumAnimatedComponents: 0,
};
