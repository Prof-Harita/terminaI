import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DesktopAutomationService } from '../DesktopAutomationService.js';
import { MockDriver } from '../../drivers/mockDriver.js';

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
        } as any,
      },
    });

    await svc.type({ target: 'name:"Password"', text: 'secret' } as any);

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
        } as any,
      },
    });

    // Explicitly false even if it was password (though here it's text)
    await svc.type({
      target: 'name:"Username"',
      text: 'user',
      redactInLogs: false,
    } as any);
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
    } as any);
    expect(typeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        redactInLogs: true,
      }),
    );
  });
});
