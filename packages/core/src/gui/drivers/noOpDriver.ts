/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  DesktopDriver,
  DriverConnectionStatus,
  DriverHealth,
} from './types.js';
import type {
  DriverCapabilities,
  DriverDescriptor,
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

/**
 * No-op driver for unsupported platforms (e.g., macOS).
 * All methods return empty/no-op results without throwing.
 * This prevents CLI crashes on darwin while logging warnings.
 */
export class NoOpDriver implements DesktopDriver {
  readonly name = 'NoOpDriver';
  readonly kind = 'mock' as const;
  readonly version = '0.0.0';

  private readonly descriptor: DriverDescriptor = {
    name: this.name,
    kind: this.kind,
    version: this.version,
    capabilities: {
      canSnapshot: false,
      canClick: false,
      canType: false,
      canScroll: false,
      canKey: false,
      canOcr: false,
      canScreenshot: false,
      canInjectInput: false,
    },
  };

  async connect(): Promise<DriverConnectionStatus> {
    return {
      connected: false,
      error: 'GUI Automation not supported on this platform',
    };
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async getHealth(): Promise<DriverHealth> {
    return {
      status: 'unhealthy',
      details: 'GUI Automation not supported on this platform (darwin)',
    };
  }

  async getCapabilities(): Promise<DriverCapabilities> {
    return this.descriptor.capabilities;
  }

  async snapshot(_args: UiSnapshotArgs): Promise<VisualDOMSnapshot> {
    console.warn('[NoOpDriver] snapshot() called on unsupported platform');
    return {
      snapshotId: 'noop-snapshot',
      timestamp: new Date().toISOString(),
      activeApp: {
        pid: 0,
        title: 'NoOp - Unsupported Platform',
      },
      driver: this.descriptor,
    };
  }

  async click(_args: UiClickArgs): Promise<UiActionResult> {
    console.warn('[NoOpDriver] click() called on unsupported platform');
    return {
      status: 'error',
      driver: this.descriptor,
      message: 'GUI Automation not supported on this platform',
    };
  }

  async clickXy(_args: UiClickXyArgs): Promise<UiActionResult> {
    console.warn('[NoOpDriver] clickXy() called on unsupported platform');
    return {
      status: 'error',
      driver: this.descriptor,
      message: 'GUI Automation not supported on this platform',
    };
  }

  async type(_args: UiTypeArgs): Promise<UiActionResult> {
    console.warn('[NoOpDriver] type() called on unsupported platform');
    return {
      status: 'error',
      driver: this.descriptor,
      message: 'GUI Automation not supported on this platform',
    };
  }

  async key(_args: UiKeyArgs): Promise<UiActionResult> {
    console.warn('[NoOpDriver] key() called on unsupported platform');
    return {
      status: 'error',
      driver: this.descriptor,
      message: 'GUI Automation not supported on this platform',
    };
  }

  async scroll(_args: UiScrollArgs): Promise<UiActionResult> {
    console.warn('[NoOpDriver] scroll() called on unsupported platform');
    return {
      status: 'error',
      driver: this.descriptor,
      message: 'GUI Automation not supported on this platform',
    };
  }

  async focus(_args: UiFocusArgs): Promise<UiActionResult> {
    console.warn('[NoOpDriver] focus() called on unsupported platform');
    return {
      status: 'error',
      driver: this.descriptor,
      message: 'GUI Automation not supported on this platform',
    };
  }
}
