/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { computeMinimumReviewLevel } from '../computeMinimumReviewLevel.js';
import type { ActionProfile } from '../types.js';
import type { Config } from '../../../config/config.js';

describe('computeMinimumReviewLevel', () => {
  const mockConfig = {
    getSecurityProfile: () => 'balanced',
    getApprovalPin: () => undefined,
    getTrustedDomains: () => [],
    getCriticalPaths: () => [],
    getWorkspaceContext: () => ({ isPathWithinWorkspace: () => true }),
    getTargetDir: () => '/workspace',
  } as unknown as Config;

  // Helper to create base profile
  const createProfile = (overrides: Partial<ActionProfile>): ActionProfile => ({
    toolName: 'test_tool',
    operations: ['read'],
    roots: [],
    touchedPaths: [],
    outsideWorkspace: false,
    usesPrivilege: false,
    hasUnboundedScopeSignals: false,
    parseConfidence: 'high',
    provenance: ['model_suggestion'],
    rawSummary: 'test command',
    ...overrides,
  });

  describe('Level A - No approval', () => {
    it('should return A for read-only inside workspace', () => {
      const profile = createProfile({
        operations: ['read'],
        outsideWorkspace: false,
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('A');
      expect(result.requiresClick).toBe(false);
      expect(result.requiresPin).toBe(false);
      expect(result.reasons).toContain(
        'Action is read-only, bounded, and reversible',
      );
    });

    it('should return A for git commit inside workspace', () => {
      const profile = createProfile({
        operations: ['write'],
        roots: ['git'],
        outsideWorkspace: false,
        rawSummary: 'git commit -am "message"',
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('A');
      expect(result.requiresClick).toBe(false);
      expect(result.requiresPin).toBe(false);
    });
  });

  describe('Level B - Click-to-approve', () => {
    it('should return B for package install (write operation)', () => {
      const profile = createProfile({
        operations: ['write', 'network'],
        roots: ['npm'],
        rawSummary: 'npm install lodash',
        provenance: ['model_suggestion'],
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('B');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(false);
    });

    it('should return B for network with untrusted provenance', () => {
      const profile = createProfile({
        operations: ['network'],
        provenance: ['workspace_file'],
        rawSummary: 'curl from script',
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('B');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(false);
    });

    it('should return B for UI automation', () => {
      const profile = createProfile({
        operations: ['ui'],
        rawSummary: 'ui.click #button',
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('B');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(false);
      expect(result.reasons).toContain('UI automation requires user review');
    });

    it('should return B for bounded delete inside workspace', () => {
      const profile = createProfile({
        operations: ['delete'],
        touchedPaths: ['/workspace/someDir'],
        hasUnboundedScopeSignals: false,
        outsideWorkspace: false,
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('B');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(false);
      expect(result.reasons).toContain('Delete operation detected');
    });

    it('should return B for privileged command inside workspace', () => {
      const profile = createProfile({
        operations: ['privileged'],
        roots: ['sudo'],
        outsideWorkspace: false,
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('B');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(false);
      expect(result.reasons).toContain('Privileged operation (sudo/doas/su)');
    });

    it('should bump A to B when outsideWorkspace is true', () => {
      const profile = createProfile({
        operations: ['write'],
        outsideWorkspace: true,
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
      expect(result.reasons).toContain(
        'Action touches paths outside workspace',
      );
    });
  });

  describe('Level C - Click + PIN', () => {
    it('should return C for rm -rf ~ (unbounded scope)', () => {
      const profile = createProfile({
        operations: ['delete'],
        hasUnboundedScopeSignals: true,
        touchedPaths: ['~'],
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
      expect(result.reasons).toContain(
        'Delete operation with unbounded scope (/, ~, wildcards)',
      );
    });

    it('should return C for rm -rf / (unbounded scope)', () => {
      const profile = createProfile({
        operations: ['delete'],
        hasUnboundedScopeSignals: true,
        touchedPaths: ['/'],
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
    });

    it('should return C for privileged command outside workspace', () => {
      const profile = createProfile({
        operations: ['privileged', 'delete'],
        roots: ['sudo'],
        outsideWorkspace: true,
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
      expect(result.reasons).toContain(
        'Privileged operation outside workspace',
      );
    });

    it('should return C for device operations', () => {
      const profile = createProfile({
        operations: ['device', 'write'],
        roots: ['dd'],
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
      expect(result.reasons).toContain(
        'Action involves device-level operations',
      );
    });

    it('should return C when parseConfidence is low', () => {
      const profile = createProfile({
        operations: ['unknown'],
        parseConfidence: 'low',
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
      expect(result.reasons).toContain(
        'Parse confidence is low - cannot safely reason about action',
      );
    });

    it('should bump B to C when outsideWorkspace is true', () => {
      const profile = createProfile({
        operations: ['delete'],
        hasUnboundedScopeSignals: false,
        outsideWorkspace: true,
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
      expect(result.reasons).toContain('Delete operation detected');
      expect(result.reasons).toContain(
        'Action touches paths outside workspace',
      );
    });
  });

  describe('Provenance-based escalation', () => {
    it('should bump level for web_remote_user with non-read operations', () => {
      const profile = createProfile({
        operations: ['write'],
        provenance: ['web_remote_user'],
        outsideWorkspace: false,
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
      expect(result.reasons).toContain(
        'Action from web remote user (non-read)',
      );
    });

    it('should NOT bump for web_remote_user with pure read', () => {
      const profile = createProfile({
        operations: ['read'],
        provenance: ['web_remote_user'],
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('A');
      expect(result.requiresClick).toBe(false);
      expect(result.requiresPin).toBe(false);
    });

    it('should require B for network operations with untrusted provenance', () => {
      const profile = createProfile({
        operations: ['network'],
        provenance: ['web_content'],
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      expect(result.level).toBe('B');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(false);
      expect(result.reasons).toContain(
        'Network operation with untrusted provenance',
      );
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple escalation factors correctly', () => {
      const profile = createProfile({
        operations: ['delete', 'privileged'],
        hasUnboundedScopeSignals: true,
        outsideWorkspace: true,
        provenance: ['web_remote_user'],
      });
      const result = computeMinimumReviewLevel(profile, mockConfig);
      // Should be C immediately due to unbounded scope
      expect(result.level).toBe('C');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(true);
    });
  });
});
