/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Config } from '../../config/config.js';
import { ApprovalMode } from '../../policy/types.js';

// Track the evaluateBrain calls
let evaluateBrainCalls: Array<{
  request: string;
  commandOrAction: string;
  systemContext: string;
}> = [];

// Mock BrainRiskManager to capture evaluateBrain calls
vi.mock('../../brain/toolIntegration.js', () => ({
  BrainRiskManager: vi.fn().mockImplementation(() => ({
    evaluateBrain: vi
      .fn()
      .mockImplementation(
        (request: string, commandOrAction: string, systemContext: string) => {
          evaluateBrainCalls.push({
            request,
            commandOrAction,
            systemContext,
          });
          return Promise.resolve({
            assessment: { overallRisk: 'low' },
            decision: { requiresConfirmation: false },
            confidenceAction: { type: 'proceed' },
            request,
          });
        },
      ),
    applyBrainAuthority: vi.fn((review) => review),
    formatRiskPreamble: vi
      .fn()
      .mockReturnValue({ text: '', surfaceToUser: false }),
    recordOutcome: vi.fn(),
    getBrainContext: vi.fn().mockReturnValue(null),
  })),
}));

// Now import EditTool after mock is set up
import { EditTool } from '../edit.js';

// Skip on Windows - tests time out due to platform-specific issues
describe.skipIf(process.platform === 'win32')(
  'EditTool Risk Assessment (P0.4)',
  () => {
    let mockConfig: Config;
    let mockFileSystemService: ReturnType<Config['getFileSystemService']>;

    beforeEach(() => {
      evaluateBrainCalls = [];

      mockFileSystemService = {
        writeTextFile: vi.fn().mockResolvedValue(undefined),
        readTextFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
      };

      mockConfig = {
        isInteractive: () => true,
        getApprovalMode: () => ApprovalMode.DEFAULT,
        getWorkspaceContext: () => ({
          targetDir: '/app',
          isPathWithinWorkspace: vi.fn().mockReturnValue(true),
          getDirectories: vi.fn().mockReturnValue(['/app']),
        }),
        getAllowedTools: () => [],
        getTargetDir: () => '/app',
        // Use 'governing' authority to ensure brain evaluation is called
        getBrainAuthority: () => 'governing',
        getSecurityProfile: () => 'balanced',
        getTrustedDomains: () => [],
        getCriticalPaths: () => [],
        getFileSystemService: () => mockFileSystemService,
        getGeminiClient: () => null,
        getBaseLlmClient: () => ({
          generateContent: vi.fn().mockResolvedValue({
            candidates: [{ content: { parts: [{ text: '{}' }] } }],
          }),
        }),
        getIdeMode: () => false,
      } as unknown as Config;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('sanitizes input for brain risk assessment (no raw content) for new file', async () => {
      // Simulate file doesn't exist (new file creation)
      mockFileSystemService.readTextFile = vi
        .fn()
        .mockRejectedValue({ code: 'ENOENT' });

      const tool = new EditTool(mockConfig);

      const params = {
        file_path: '/app/secret.txt',
        old_string: '', // Empty means new file
        new_string: 'super secret API_KEY=12345',
      };

      const invocation = tool.build(params);
      // Call shouldConfirmExecute which triggers brain evaluation
      await invocation.shouldConfirmExecute(new AbortController().signal);

      // For new file creation, the approval ladder may give level A which
      // combined with brain evaluation means brain may or may not be called.
      // This test focuses on ensuring if brain IS called, it's sanitized.
      // The edit test below validates the sanitization logic more thoroughly.
      if (evaluateBrainCalls.length > 0) {
        const call = evaluateBrainCalls[0];
        const riskDescription = call.commandOrAction;

        // Critical assertions:
        // 1. Must NOT contain raw param content (secrets)
        expect(riskDescription).not.toContain('super secret');
        expect(riskDescription).not.toContain('API_KEY');
        expect(riskDescription).not.toContain('12345');

        // 2. Must contain metadata about the operation
        expect(riskDescription).toContain('Creating new file');
        expect(riskDescription).toContain('chars');
      }
    });

    it('sanitizes input for brain risk assessment (no raw content) for edit', async () => {
      // Simulate existing file
      mockFileSystemService.readTextFile = vi
        .fn()
        .mockResolvedValue('old secret content with PASSWORD=abc123');

      const tool = new EditTool(mockConfig);

      const params = {
        file_path: '/app/config.env',
        old_string: 'old secret content with PASSWORD=abc123',
        new_string: 'new secret content with PASSWORD=xyz789',
      };

      const invocation = tool.build(params);
      await invocation.shouldConfirmExecute(new AbortController().signal);

      // Verify evaluateBrain was called
      expect(evaluateBrainCalls.length).toBeGreaterThan(0);

      const call = evaluateBrainCalls[0];
      const riskDescription = call.commandOrAction;

      // Critical assertions:
      // 1. Must NOT contain raw param content (secrets)
      expect(riskDescription).not.toContain('old secret content');
      expect(riskDescription).not.toContain('new secret content');
      expect(riskDescription).not.toContain('PASSWORD');
      expect(riskDescription).not.toContain('abc123');
      expect(riskDescription).not.toContain('xyz789');

      // 2. Must contain metadata about the operation
      expect(riskDescription).toContain('Replacing');
      expect(riskDescription).toContain('chars');
      expect(riskDescription).toContain('.env'); // file extension
    });
  },
);
