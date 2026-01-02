import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopAutomationService } from '../DesktopAutomationService.js';
import { MockDriver } from '../../drivers/mockDriver.js';

describe('DesktopAutomationService - diagnose', () => {
  let mockDriver: MockDriver;

  beforeEach(() => {
    mockDriver = new MockDriver();
    DesktopAutomationService.setDriverForTest(mockDriver);
    const svc = DesktopAutomationService.getInstance();
    svc.setEnabled(true);
  });

  it('returns a healthy report when driver is healthy', async () => {
    const svc = DesktopAutomationService.getInstance();

    mockDriver.snapshot = async () => ({
      snapshotId: 'mock-' + Date.now(),
      timestamp: new Date().toISOString(),
      activeApp: { pid: 1, title: 'Mock App' },
      tree: {
        id: 'root',
        role: 'desktop',
        name: 'Desktop',
        children: [
          {
            id: 'app1',
            role: 'application',
            name: 'Mock App',
            children: [{ id: 'win1', role: 'window', name: 'Mock Window' }],
          },
        ],
      },
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '0.0.1',
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

    const report = await svc.diagnose();

    expect(report.connection.connected).toBe(true);
    expect(report.driver.name).toBe('mock');
    // Expect no warnings
    expect(report.warnings).toEqual([]);
    expect(report.snapshotSanity.desktopRootChildren).toBe(1);
    expect(report.snapshotSanity.applicationNamesSample).toContain('Mock App');
  });

  it('warns if driver is disconnected', async () => {
    const svc = DesktopAutomationService.getInstance();
    svc.setEnabled(false);

    const report = await svc.diagnose();
    expect(report.connection.connected).toBe(false);
    expect(report.warnings).toContain('Driver disconnected or disabled');
  });

  it('warns if snapshot tree is empty', async () => {
    const svc = DesktopAutomationService.getInstance();
    // Override snapshot to return empty tree
    mockDriver.snapshot = async () => ({
      snapshotId: 'empty',
      timestamp: new Date().toISOString(),
      activeApp: { pid: 0, title: 'None' },
      tree: { id: 'root', role: 'desktop', children: [] },
      driver: {
        name: 'mock',
        kind: 'mock',
        version: '0.0.1',
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

    const report = await svc.diagnose();
    expect(report.connection.connected).toBe(true);
    expect(report.warnings).toEqual(['Empty accessibility tree returned']);
  });
});
