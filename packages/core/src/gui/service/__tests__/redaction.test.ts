/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesktopAutomationService } from '../DesktopAutomationService.js';
import { MockDriver } from '../../drivers/mockDriver.js';
import type { UiTypeArgs } from '../../protocol/schemas.js';

describe('DesktopAutomationService - Smart Redaction', () => {
  let mockDriver: MockDriver;

  beforeEach(() => {
    mockDriver = new MockDriver();
    DesktopAutomationService.setDriverForTest(mockDriver);
    const svc = DesktopAutomationService.getInstance();
    svc.setEnabled(true);
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

  it('redacts automatically for password fields', async () => {
    const svc = DesktopAutomationService.getInstance();
    const typeSpy = vi.spyOn(mockDriver, 'type');

    // Setup snapshot with password field
    mockDriver.snapshot = async () => ({
      snapshotId: '1',
      timestamp: '',
      activeApp: { pid: 1, title: '' },
      tree: {
        id: 'root',
        role: 'desktop',
        children: [{ id: 'pwd', role: 'password text', name: 'Password' }],
      },
      driver: {
        name: 'mock',
        kind: 'mock',
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
      },
    });

    await svc.type({
      target: 'name:"Password"',
      text: 'secret',
      mode: 'insert',
      verify: true,
      // Intentionally omit `redactInLogs` to exercise smart-redaction inference.
    } as unknown as UiTypeArgs);

    expect(typeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        redactInLogs: true,
      }),
    );
  });

  it('honors explicit redaction setting', async () => {
    const svc = DesktopAutomationService.getInstance();
    const typeSpy = vi.spyOn(mockDriver, 'type');

    mockDriver.snapshot = async () => ({
      snapshotId: '1',
      timestamp: '',
      activeApp: { pid: 1, title: '' },
      tree: {
        id: 'root',
        role: 'desktop',
        children: [{ id: 'txt', role: 'text', name: 'Username' }],
      },
      driver: {
        name: 'mock',
        kind: 'mock',
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
      },
    });

    // Explicitly false even if it was password (though here it's text)
    await svc.type({
      target: 'name:"Username"',
      text: 'user',
      redactInLogs: false,
      mode: 'insert',
      verify: true,
    });
    expect(typeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        redactInLogs: false,
      }),
    );

    // Explicitly true
    await svc.type({
      target: 'name:"Username"',
      text: 'user',
      redactInLogs: true,
      mode: 'insert',
      verify: true,
    });
    expect(typeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        redactInLogs: true,
      }),
    );
  });
});
