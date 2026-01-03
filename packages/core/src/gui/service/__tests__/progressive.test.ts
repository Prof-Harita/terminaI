/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesktopAutomationService } from '../DesktopAutomationService.js';
import { MockDriver } from '../../drivers/mockDriver.js';
import type { DriverDescriptor, ElementNode } from '../../protocol/types.js';

describe('DesktopAutomationService - Progressive Snapshot', () => {
  let mockDriver: MockDriver;

  beforeEach(() => {
    mockDriver = new MockDriver();
    DesktopAutomationService.setDriverForTest(mockDriver);
    const svc = DesktopAutomationService.getInstance();
    svc.setEnabled(true);
    // Ensure capabilities allow snapshot
    mockDriver.getCapabilities = async () => ({
      canSnapshot: true,
      canClick: true,
      canType: true,
      canScroll: true,
      canKey: true,
      canOcr: false,
      canScreenshot: false,
      canInjectInput: false,
    });
  });

  it('grafts active window details into outline', async () => {
    const svc = DesktopAutomationService.getInstance();

    const outlineTree: ElementNode = {
      id: 'root',
      role: 'desktop',
      children: [
        {
          id: 'app1',
          role: 'application',
          children: [
            { id: 'win1', role: 'window', name: 'My Window', children: [] }, // shallow
          ],
        },
      ],
    };

    const deepTree: ElementNode = {
      id: 'win1',
      role: 'window',
      name: 'My Window',
      children: [
        {
          id: 'content',
          role: 'group',
          children: [{ id: 'btn', role: 'button', name: 'Submit' }],
        },
      ],
    };

    const driverShim: DriverDescriptor = {
      name: 'mock',
      kind: 'native' as const,
      version: '1.0',
      capabilities: {
        canSnapshot: true,
        canClick: true,
        canType: true,
        canScroll: true,
        canKey: true,
        canOcr: false,
        canScreenshot: false,
        canInjectInput: false,
      },
    };

    mockDriver.snapshot = async (args) => {
      if (args.scope === 'window' && args.windowId === 'win1') {
        // Deep pass
        return {
          snapshotId: 'deep',
          timestamp: 'now',
          activeApp: { pid: 1, title: 'My Window' },
          tree: deepTree,
          driver: driverShim,
        };
      }
      // Outline pass
      return {
        snapshotId: 'outline',
        timestamp: 'now',
        activeApp: { pid: 1, title: 'My Window' }, // matches window name
        tree: outlineTree,
        driver: driverShim,
      };
    };

    const result = await svc.snapshot({
      includeTree: true,
      includeScreenshot: false,
      includeTextIndex: false,
      maxDepth: 10,
      maxNodes: 100,
    });

    // Verify grafting happened
    const appNode = result.tree?.children?.[0]; // app1
    const winNode = appNode?.children?.[0]; // win1

    expect(winNode?.id).toBe('win1');
    expect(winNode?.children?.length).toBe(1); // content
    expect(winNode?.children?.[0].id).toBe('content');
    expect(result.snapshotId).toBe('outline'); // Inherited from outline container
  });

  it('bypasses progressive if includeTree is false', async () => {
    const svc = DesktopAutomationService.getInstance();
    const snapSpy = vi.spyOn(mockDriver, 'snapshot');

    await svc.snapshot({
      includeTree: false,
      includeScreenshot: false,
      includeTextIndex: false,
      maxDepth: 10,
      maxNodes: 100,
    });

    expect(snapSpy).toHaveBeenCalledTimes(1);
    const callArgs = snapSpy.mock.calls[0][0];
    expect(callArgs.includeTree).toBe(false);
  });
});
