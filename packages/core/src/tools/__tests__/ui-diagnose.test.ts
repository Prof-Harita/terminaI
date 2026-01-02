import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UiDiagnoseTool } from '../ui-diagnose.js';
import { DesktopAutomationService } from '../../gui/service/DesktopAutomationService.js';
import { MockDriver } from '../../gui/drivers/mockDriver.js';
import { Config } from '../../config/config.js';

vi.mock('../../config/config.js', () => ({
  Config: vi.fn(),
}));

describe('UiDiagnoseTool', () => {
  let mockDriver: MockDriver;

  beforeEach(() => {
    mockDriver = new MockDriver();
    DesktopAutomationService.setDriverForTest(mockDriver);
    DesktopAutomationService.getInstance().setEnabled(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('executes diagnose successfully', async () => {
    const config = new Config({} as any);
    const tool = new UiDiagnoseTool(config);
    const invocation = (tool as any).createInvocation({});

    // Override snapshot to return minimal tree
    mockDriver.snapshot = async () => ({
      snapshotId: 'test',
      timestamp: new Date().toISOString(),
      activeApp: { pid: 1, title: 'App' },
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

    const result = await invocation.execute(new AbortController().signal);
    const content = JSON.parse(result.llmContent as string);
    expect(content.status).toBe('success');
    expect(content.data.connection.connected).toBe(true);
    // Diagnose adds heuristics for empty tree
    expect(content.data.warnings).toEqual([
      'Empty accessibility tree returned',
    ]);
  });

  it('handles exceptions gracefully', async () => {
    const config = new Config({} as any);
    const tool = new UiDiagnoseTool(config);
    const invocation = (tool as any).createInvocation({});

    // Force an error in snapshot provided by mockDriver to simulate service failure?
    // Or easier: Mock implementation of diagnose on service
    const svc = DesktopAutomationService.getInstance();
    vi.spyOn(svc, 'diagnose').mockRejectedValueOnce(new Error('Kaboom'));

    const result = await invocation.execute(new AbortController().signal);
    const content = JSON.parse(result.llmContent as string);
    expect(content.status).toBe('error');
    expect(content.message).toContain('Diagnostics failed: Error: Kaboom');
  });
});
