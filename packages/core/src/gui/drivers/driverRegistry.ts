/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DesktopDriver } from './types.js';
import { LinuxAtspiDriver } from './linuxAtspiDriver.js';
import { WindowsUiaDriver } from './windowsUiaDriver.js';

import * as os from 'node:os';

let instance: DesktopDriver | undefined;

export function getDesktopDriver(): DesktopDriver {
  if (instance) return instance;

  const platform = os.platform();

  if (platform === 'linux') {
    instance = new LinuxAtspiDriver();
  } else if (platform === 'win32') {
    instance = new WindowsUiaDriver();
  } else {
    throw new Error(
      `GUI Automation: Platform ${platform} is not supported. Only 'linux' and 'win32' are supported.`,
    );
  }

  return instance;
}
