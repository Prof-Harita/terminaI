/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildToolActionProfile } from '../buildToolActionProfile.js';
import { computeMinimumReviewLevel } from '../computeMinimumReviewLevel.js';
import type { Config } from '../../../config/config.js';
import {
  EDIT_TOOL_NAME,
  FILE_OPS_TOOL_NAME,
  REPL_TOOL_NAME,
  UI_CLICK_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
} from '../../../tools/tool-names.js';

describe('buildToolActionProfile', () => {
  const mockConfig = {
    getTargetDir: () => '/workspace',
    getSecurityProfile: () => 'balanced',
    getApprovalPin: () => undefined,
    getTrustedDomains: () => [],
    getCriticalPaths: () => [],
    getWorkspaceContext: () => ({ isPathWithinWorkspace: () => true }),
  } as unknown as Config;

  it('classifies edit tool calls as write operations with touched paths', () => {
    const profile = buildToolActionProfile({
      toolName: EDIT_TOOL_NAME,
      args: { file_path: 'src/file.txt' },
      config: mockConfig,
    });

    expect(profile.operations).toContain('write');
    expect(profile.touchedPaths).toEqual(['/workspace/src/file.txt']);
    expect(profile.outsideWorkspace).toBe(false);
  });

  it('flags recursive delete of workspace root as unbounded', () => {
    const profile = buildToolActionProfile({
      toolName: FILE_OPS_TOOL_NAME,
      args: { operation: 'delete', path: '/workspace', recursive: true },
      config: mockConfig,
    });

    expect(profile.operations).toContain('delete');
    expect(profile.hasUnboundedScopeSignals).toBe(true);
    const review = computeMinimumReviewLevel(profile, mockConfig);
    expect(review.level).toBe('C');
  });

  it('classifies web fetch as network operation', () => {
    const profile = buildToolActionProfile({
      toolName: WEB_FETCH_TOOL_NAME,
      args: { url: 'https://example.com' },
      config: mockConfig,
    });

    expect(profile.operations).toContain('network');
  });

  it('classifies UI clicks as UI operations and requires approval', () => {
    const profile = buildToolActionProfile({
      toolName: UI_CLICK_TOOL_NAME,
      args: { target: '#button' },
      config: mockConfig,
    });

    expect(profile.operations).toContain('ui');
    const review = computeMinimumReviewLevel(profile, mockConfig);
    expect(review.level).toBe('B');
  });

  it('treats long shell repl code as low confidence', () => {
    const profile = buildToolActionProfile({
      toolName: REPL_TOOL_NAME,
      args: {
        language: 'shell',
        code: 'echo test\n'.repeat(50),
      },
      config: mockConfig,
    });

    expect(profile.operations).toContain('process');
    expect(profile.operations).toContain('unknown');
    expect(profile.parseConfidence).toBe('low');
    const review = computeMinimumReviewLevel(profile, mockConfig);
    expect(review.level).toBe('C');
  });
});
