import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopAutomationService } from '../DesktopAutomationService.js';
import { MockDriver } from '../../drivers/mockDriver.js';

describe('DesktopAutomationService - Selector Errors', () => {
  let mockDriver: MockDriver;

  beforeEach(() => {
    mockDriver = new MockDriver();
    DesktopAutomationService.setDriverForTest(mockDriver);
    const svc = DesktopAutomationService.getInstance();
    svc.setEnabled(true);
  });

  it('throws a friendly error when selector parsing fails in query', async () => {
    const svc = DesktopAutomationService.getInstance();

    // "name=foo &&" is invalid (trailing &&)
    await expect(
      svc.query({ selector: 'name=foo &&', limit: 1 }),
    ).rejects.toThrow(/Invalid selector syntax: "name=foo &&"/);
  });

  it('throws a friendly error when selector parsing fails in click', async () => {
    const svc = DesktopAutomationService.getInstance();

    // "role=Button &&" is invalid (trailing &&)
    await expect(
      svc.click({
        target: 'role=Button &&',
        button: 'left',
        clickCount: 1,
        verify: true,
      }),
    ).rejects.toThrow(/Invalid selector syntax: "role=Button &&"/);
  });
});
