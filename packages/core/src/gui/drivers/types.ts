/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DesktopDriver Interface
 *
 * Defines the contract that OS-specific drivers must implement.
 */

import type {
  DriverCapabilities,
  VisualDOMSnapshot,
  UiActionResult,
} from '../protocol/types.js';

import type {
  UiSnapshotArgs,
  UiClickArgs,
  UiTypeArgs,
  UiKeyArgs,
  UiScrollArgs,
  UiFocusArgs,
  UiClickXyArgs,
} from '../protocol/schemas.js';

export interface DriverConnectionStatus {
  connected: boolean;
  version?: string;
  error?: string;
}

export interface DriverHealth {
  status: 'healthy' | 'unhealthy';
  details?: string;
}

export interface DesktopDriver {
  /**
   * Initialize the driver (spawn processes, connect buses).
   */
  connect(): Promise<DriverConnectionStatus>;

  /**
   * Cleanup.
   */
  disconnect(): Promise<void>;

  /**
   * Check if driver is ready and healthy.
   */
  getHealth(): Promise<DriverHealth>;

  /**
   * Get driver capabilities.
   */
  getCapabilities(): Promise<DriverCapabilities>;

  // Actions
  snapshot(args: UiSnapshotArgs): Promise<VisualDOMSnapshot>;
  click(args: UiClickArgs): Promise<UiActionResult>;
  clickXy(args: UiClickXyArgs): Promise<UiActionResult>;
  type(args: UiTypeArgs): Promise<UiActionResult>;
  key(args: UiKeyArgs): Promise<UiActionResult>;
  scroll(args: UiScrollArgs): Promise<UiActionResult>;
  focus(args: UiFocusArgs): Promise<UiActionResult>;
}
