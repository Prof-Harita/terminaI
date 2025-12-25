import { DesktopDriver } from './types';
import {
  DriverCapabilities,
  VisualDOMSnapshot,
  UiActionResult,
} from '../protocol/types';
import { UiSnapshotArgs, UiClickArgs } from '../protocol/schemas';

export class MockDriver implements DesktopDriver {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async isHealthy(): Promise<boolean> {
    return true;
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

  async snapshot(args: UiSnapshotArgs): Promise<VisualDOMSnapshot> {
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

  async click(args: UiClickArgs): Promise<UiActionResult> {
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

  async clickXy(args: any): Promise<UiActionResult> {
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
  async type(args: any): Promise<UiActionResult> {
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
  async key(args: any): Promise<UiActionResult> {
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
  async scroll(args: any): Promise<UiActionResult> {
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
  async focus(args: any): Promise<UiActionResult> {
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
