import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopAutomationService } from '../DesktopAutomationService.js';
import { MockDriver } from '../../drivers/mockDriver.js';

describe('DesktopAutomationService - Capabilities Enforcement', () => {
  let mockDriver: MockDriver;

  beforeEach(() => {
    mockDriver = new MockDriver();
    DesktopAutomationService.setDriverForTest(mockDriver);
    const svc = DesktopAutomationService.getInstance();
    svc.setEnabled(true);
  });

  it('allows action when capability is present', async () => {
    const svc = DesktopAutomationService.getInstance();
    // mock capabilities are all true by default or set explicitly
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

    // Should not throw
    // Need to mock resolves for resolveTargetForAction calls used in click/type
    // We can rely on basic MockDriver behavior or inject snapshot response

    mockDriver.snapshot = async () => ({
      snapshotId: '1',
      timestamp: '',
      activeApp: { pid: 1, title: '' },
      tree: {
        id: 'root',
        role: 'desktop',
        children: [{ id: 'btn', role: 'button', name: 'Click Me' }],
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
        } as any,
      },
    });

    await expect(
      svc.click({ target: 'name:"Click Me"' } as any),
    ).resolves.not.toThrow();
  });

  it('throws when canClick is false', async () => {
    const svc = DesktopAutomationService.getInstance();
    mockDriver.getCapabilities = async () => ({
      canSnapshot: true,
      canClick: false, // Disabled
      canType: true,
      canScroll: true,
      canKey: true,
      canOcr: false,
      canScreenshot: false,
      canInjectInput: false,
    });

    await expect(svc.click({ target: 'Click Me' } as any)).rejects.toThrow(
      "Driver does not support 'canClick'.",
    );
  });

  it('throws when canType is false', async () => {
    const svc = DesktopAutomationService.getInstance();
    mockDriver.getCapabilities = async () => ({
      canSnapshot: true,
      canClick: true,
      canType: false, // Disabled
      canScroll: true,
      canKey: true,
      canOcr: false,
      canScreenshot: false,
      canInjectInput: false,
    });

    await expect(svc.type({ text: 'hello' } as any)).rejects.toThrow(
      "Driver does not support 'canType'.",
    );
  });

  it('throws when canScroll is false', async () => {
    const svc = DesktopAutomationService.getInstance();
    mockDriver.getCapabilities = async () => ({
      canSnapshot: true,
      canClick: true,
      canType: true,
      canScroll: false, // Disabled
      canKey: true,
      canOcr: false,
      canScreenshot: false,
      canInjectInput: false,
    });

    await expect(svc.scroll({ direction: 'down' } as any)).rejects.toThrow(
      "Driver does not support 'canScroll'.",
    );
  });
});
