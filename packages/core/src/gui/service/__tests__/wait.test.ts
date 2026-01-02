import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DesktopAutomationService } from '../DesktopAutomationService.js';
import { MockDriver } from '../../drivers/mockDriver.js';

describe('DesktopAutomationService - waitFor', () => {
  let mockDriver: MockDriver;

  beforeEach(() => {
    vi.useFakeTimers();
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('respects timeout and interval', async () => {
    const svc = DesktopAutomationService.getInstance();

    // Setup mock before spying? Or spy then mock implementation
    const snapSpy = vi
      .spyOn(mockDriver, 'snapshot')
      .mockImplementation(async () => ({
        snapshotId: '1',
        timestamp: '',
        activeApp: { pid: 1, title: '' },
        tree: { id: 'root', role: 'desktop', children: [] },
        driver: {
          name: 'mock',
          kind: 'mock',
          version: '1.0',
          capabilities: { canSnapshot: true } as any,
        },
      }));

    const waitPromise = svc.waitFor({
      selector: 'name:"btn"',
      timeoutMs: 1000,
      intervalMs: 200,
    } as any);

    // Run timers until timeout
    await vi.runAllTimersAsync();

    // It should reject or resolve with error?
    // Implementation returns: { status: 'error', message: 'Timeout ...' }
    const result = await waitPromise;
    expect(result.status).toBe('error');
    expect(result.message).toContain('Timeout waiting');

    // Calls: 0ms, 200ms, 400ms, 600ms, 800ms. (5 calls?)
    expect(snapSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(snapSpy.mock.calls.length).toBeLessThanOrEqual(7);
  });

  it('returns success immediately if condition met', async () => {
    const svc = DesktopAutomationService.getInstance();
    mockDriver.snapshot = async () => ({
      snapshotId: '1',
      timestamp: '',
      activeApp: { pid: 1, title: '' },
      tree: {
        id: 'root',
        role: 'desktop',
        children: [{ id: 'btn', role: 'button', name: 'btn' }],
      },
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '1.0',
        capabilities: { canSnapshot: true } as any,
      },
    });

    const result = await svc.waitFor({
      selector: 'name:"btn"',
      timeoutMs: 1000,
    } as any); // "btn" logic assumed name
    expect(result.status).toBe('success');
  });
});
