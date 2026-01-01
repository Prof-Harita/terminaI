/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildShellActionProfile } from '../buildShellActionProfile.js';
import { computeMinimumReviewLevel } from '../computeMinimumReviewLevel.js';
import type { Config } from '../../../config/config.js';

describe('buildShellActionProfile', () => {
  const mockConfig = {
    getSecurityProfile: () => 'balanced',
    getApprovalPin: () => undefined,
    getTrustedDomains: () => [],
    getCriticalPaths: () => [],
    getWorkspaceContext: () => ({ isPathWithinWorkspace: () => true }),
    getTargetDir: () => '/workspace',
  } as unknown as Config;

  const workspaces = ['/home/user/project'];
  const cwd = '/home/user/project';

  describe('Operation classification', () => {
    it('should classify free -h as read operation', () => {
      const profile = buildShellActionProfile({
        command: 'free -h',
        cwd,
        workspaces,
      });

      expect(profile.operations).toContain('read');
      expect(profile.parseConfidence).not.toBe('low');
      expect(profile.outsideWorkspace).toBe(false);

      // Verify it results in Level A
      const review = computeMinimumReviewLevel(profile, mockConfig);
      expect(review.level).toBe('A');
    });

    it('should classify rm -rf / as delete with unbounded scope', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf /',
        cwd,
        workspaces,
      });

      expect(profile.operations).toContain('delete');
      expect(profile.hasUnboundedScopeSignals).toBe(true);
      expect(profile.outsideWorkspace).toBe(true);

      // Verify it results in Level C
      const review = computeMinimumReviewLevel(profile, mockConfig);
      expect(review.level).toBe('C');
    });

    it('should classify sudo rm -rf someDir outside workspace as privileged + delete', () => {
      const profile = buildShellActionProfile({
        command: 'sudo rm -rf /etc/config',
        cwd,
        workspaces,
      });

      expect(profile.operations).toContain('privileged');
      expect(profile.operations).toContain('delete');
      expect(profile.outsideWorkspace).toBe(true);

      // Verify it results in Level C
      const review = computeMinimumReviewLevel(profile, mockConfig);
      expect(review.level).toBe('C');
    });

    it('should classify git commit as write operation', () => {
      const profile = buildShellActionProfile({
        command: 'git commit -am "test"',
        cwd,
        workspaces,
      });

      expect(profile.operations).toContain('write');
      expect(profile.roots).toContain('git');
    });

    it('should detect write operations from redirections', () => {
      const profile = buildShellActionProfile({
        command: 'echo "test" > file.txt',
        cwd,
        workspaces,
      });

      expect(profile.operations).toContain('write');
    });

    it('should classify network commands', () => {
      const profile = buildShellActionProfile({
        command: 'curl https://example.com',
        cwd,
        workspaces,
      });

      expect(profile.operations).toContain('network');
    });

    it('should classify device operations', () => {
      const profile = buildShellActionProfile({
        command: 'dd if=/dev/zero of=/ dev/sda',
        cwd,
        workspaces,
      });

      expect(profile.operations).toContain('device');

      // Verify it results in Level C
      const review = computeMinimumReviewLevel(profile, mockConfig);
      expect(review.level).toBe('C');
    });
  });

  describe('Outside workspace detection', () => {
    it('should detect / as outside workspace', () => {
      const profile = buildShellActionProfile({
        command: 'ls /',
        cwd,
        workspaces,
      });

      expect(profile.outsideWorkspace).toBe(true);
    });

    it('should detect /etc as outside workspace', () => {
      const profile = buildShellActionProfile({
        command: 'cat /etc/hosts',
        cwd,
        workspaces,
      });

      expect(profile.outsideWorkspace).toBe(true);
    });

    it('should detect ~ as outside workspace (when not in workspace)', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf ~',
        cwd,
        workspaces,
      });

      expect(profile.outsideWorkspace).toBe(true);
      expect(profile.hasUnboundedScopeSignals).toBe(true);
    });
  });

  describe('Parse confidence', () => {
    it('should have high confidence for simple commands', () => {
      const profile = buildShellActionProfile({
        command: 'ls -la',
        cwd,
        workspaces,
      });

      expect(profile.parseConfidence).toBe('high');
    });

    it('should have low confidence for malformed commands', () => {
      const profile = buildShellActionProfile({
        command: 'ls &&', // Malformed
        cwd,
        workspaces,
      });

      expect(profile.parseConfidence).toBe('low');

      // Verify low confidence results in Level C
      const review = computeMinimumReviewLevel(profile, mockConfig);
      expect(review.level).toBe('C');
    });
  });

  describe('Unbounded scope detection', () => {
    it('should detect rm -rf ~ as unbounded', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf ~',
        cwd,
        workspaces,
      });

      expect(profile.hasUnboundedScopeSignals).toBe(true);
    });

    it('should detect rm -rf / as unbounded', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf /',
        cwd,
        workspaces,
      });

      expect(profile.hasUnboundedScopeSignals).toBe(true);
    });

    it('should detect rm -rf * as unbounded', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf *',
        cwd,
        workspaces,
      });

      expect(profile.hasUnboundedScopeSignals).toBe(true);
    });

    it('should NOT mark bounded delete as unbounded', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf ./specific_dir',
        cwd,
        workspaces,
      });

      expect(profile.hasUnboundedScopeSignals).toBe(false);
    });
  });

  describe('Complex commands', () => {
    it('should handle chained commands', () => {
      const profile = buildShellActionProfile({
        command: 'ls -la && cat file.txt',
        cwd,
        workspaces,
      });

      expect(profile.roots).toContain('ls');
      expect(profile.roots).toContain('cat');
      expect(profile.operations).toContain('read');
    });

    it('should handle piped commands', () => {
      const profile = buildShellActionProfile({
        command: 'cat file.txt | grep "test"',
        cwd,
        workspaces,
      });

      expect(profile.roots).toContain('cat');
      expect(profile.roots).toContain('grep');
    });
  });
});
