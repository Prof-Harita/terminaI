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

export class MockDriver implements DesktopDriver {
  readonly name = 'mock';
  readonly kind = 'mock';
  readonly version = '0.0.1';

  async connect(): Promise<DriverConnectionStatus> {
    return { connected: true, version: this.version };
  }

  async disconnect(): Promise<void> {}

  async getHealth(): Promise<DriverHealth> {
    return { status: 'healthy', details: 'Mock driver always healthy' };
  }

  async getCapabilities(): Promise<DriverCapabilities> {
    return {
      canSnapshot: true,
      canClick: true,
      canType: true,
      canScroll: true,
      canKey: true,
      canOcr: false,
      canScreenshot: false,
      canInjectInput: false,
    };
  }

  async snapshot(_args: UiSnapshotArgs): Promise<VisualDOMSnapshot> {
    return {
      snapshotId: 'mock-' + Date.now(),
      timestamp: new Date().toISOString(),
      activeApp: { pid: 0, title: 'Mock App' },
      tree: {
        id: 'root',
        role: 'Window',
        name: 'Mock Window',
        children: [
          {
            id: 'btn',
            role: 'Button',
            name: 'Submit',
            states: { enabled: true },
          },
        ],
      },
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '0.0.1',
        capabilities: await this.getCapabilities(),
      },
    };
  }

  async click(_args: UiClickArgs): Promise<UiActionResult> {
    return {
      status: 'success',
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '1',
        capabilities: await this.getCapabilities(),
      },
    };
  }

  async clickXy(_args: UiClickXyArgs): Promise<UiActionResult> {
    return {
      status: 'success',
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '1',
        capabilities: await this.getCapabilities(),
      },
    };
  }
  async type(_args: UiTypeArgs): Promise<UiActionResult> {
    return {
      status: 'success',
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '1',
        capabilities: await this.getCapabilities(),
      },
    };
  }
  async key(_args: UiKeyArgs): Promise<UiActionResult> {
    return {
      status: 'success',
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '1',
        capabilities: await this.getCapabilities(),
      },
    };
  }
  async scroll(_args: UiScrollArgs): Promise<UiActionResult> {
    return {
      status: 'success',
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '1',
        capabilities: await this.getCapabilities(),
      },
    };
  }
  async focus(_args: UiFocusArgs): Promise<UiActionResult> {
    return {
      status: 'success',
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '1',
        capabilities: await this.getCapabilities(),
      },
    };
  }
}
