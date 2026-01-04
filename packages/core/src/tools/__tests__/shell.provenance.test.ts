/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { ApprovalMode } from '../../policy/types.js';
import type { Config } from '../../config/config.js';
import { ShellToolInvocation } from '../shell.js';

describe('ShellToolInvocation provenance', () => {
  it('should include provenance in confirmation details and escalate review', async () => {
    const mockConfig = {
      isInteractive: () => true,
      getApprovalMode: () => ApprovalMode.DEFAULT,
      getWorkspaceContext: () => ({ targetDir: '/workspace' }),
      getAllowedTools: () => [],
      getTargetDir: () => '/workspace',
      getApprovalPin: () => '123456',
      getBrainAuthority: () => 'escalate-only',
      getSecurityProfile: () => 'balanced',
      getTrustedDomains: () => [],
      getCriticalPaths: () => [],
    };
    const invocation = new ShellToolInvocation(
      mockConfig as unknown as Config,
      { command: 'touch /workspace/test.txt', dir_path: '/workspace' },
    );

    // Directly mock the private brainManager property
    (invocation as unknown as { brainManager: unknown }).brainManager = {
      evaluateBrain: vi.fn().mockResolvedValue(null),
      applyBrainAuthority: vi.fn((r) => r),
      getBrainContext: vi.fn().mockReturnValue(null),
      formatRiskPreamble: vi
        .fn()
        .mockReturnValue({ text: '', surfaceToUser: false }),
      recordOutcome: vi.fn(),
    };
    // Set provenance via the public setter
    invocation.setProvenance(['web_remote_user']);

    const details = await invocation.shouldConfirmExecute(
      new AbortController().signal,
    );

    expect(details && details.type).toBe('exec');
    if (details && details.type === 'exec') {
      expect(details.provenance).toEqual(['web_remote_user']);
      expect(details.reviewLevel).toBe('C');
    }
  });
});
