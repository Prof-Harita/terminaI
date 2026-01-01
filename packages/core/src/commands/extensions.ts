/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';

export function listExtensions(config: Config) {
  return config.getExtensions();
}
