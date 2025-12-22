/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildShellActionProfile } from '../../safety/approval-ladder/buildShellActionProfile.js';
import { computeMinimumReviewLevel } from '../../safety/approval-ladder/computeMinimumReviewLevel.js';

describe('PIN Verification Logic', () => {
  const mockWorkspace = '/workspace';
  const mockCwd = mockWorkspace;

  describe('Review level computation for PIN-requiring commands', () => {
    it('should require PIN for unbounded scope deletes (rm -rf /)', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf /',
        cwd: mockCwd,
        workspaces: [mockWorkspace],
      });

      const result = computeMinimumReviewLevel(profile);

      expect(result.level).toBe('C');
      expect(result.requiresPin).toBe(true);
      // Check that unbounded scope was detected
      expect(
        result.reasons.some((r) => r.toLowerCase().includes('unbounded')),
      ).toBe(true);
    });

    it('should require PIN for device operations (dd)', () => {
      const profile = buildShellActionProfile({
        command: 'dd if=/dev/zero of=/dev/sda',
        cwd: mockCwd,
        workspaces: [mockWorkspace],
      });

      const result = computeMinimumReviewLevel(profile);

      expect(result.level).toBe('C');
      expect(result.requiresPin).toBe(true);
      // Check that device operation was detected
      expect(
        result.reasons.some((r) => r.toLowerCase().includes('device')),
      ).toBe(true);
    });

    it('should require PIN for privileged deletes outside workspace', () => {
      const profile = buildShellActionProfile({
        command: 'sudo rm -rf /etc/config',
        cwd: mockCwd,
        workspaces: [mockWorkspace],
      });

      const result = computeMinimumReviewLevel(profile);

      // This should be Level C because it's privileged delete outside workspace
      expect(result.level).toBe('C');
      expect(result.requiresPin).toBe(true);
    });

    it('should require PIN for unbounded home directory delete (rm -rf ~)', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf ~',
        cwd: mockCwd,
        workspaces: [mockWorkspace],
      });

      const result = computeMinimumReviewLevel(profile);

      expect(result.level).toBe('C');
      expect(result.requiresPin).toBe(true);
      // Check that unbounded scope was detected
      expect(
        result.reasons.some((r) => r.toLowerCase().includes('unbounded')),
      ).toBe(true);
    });
  });

  describe('Review level computation for non-PIN commands', () => {
    it('should NOT require PIN for read-only commands (free -h)', () => {
      const profile = buildShellActionProfile({
        command: 'free -h',
        cwd: mockCwd,
        workspaces: [mockWorkspace],
      });

      const result = computeMinimumReviewLevel(profile);

      expect(result.level).toBe('A');
      expect(result.requiresPin).toBe(false);
      expect(result.requiresClick).toBe(false);
    });

    it('should NOT require PIN for bounded deletes inside workspace', () => {
      const profile = buildShellActionProfile({
        command: 'rm -rf ./node_modules',
        cwd: mockCwd,
        workspaces: [mockWorkspace],
      });

      const result = computeMinimumReviewLevel(profile);

      expect(result.level).toBe('B');
      expect(result.requiresPin).toBe(false);
      expect(result.requiresClick).toBe(true);
    });

    it('should NOT require PIN for npm install (write + network, Inside workspace)', () => {
      const profile = buildShellActionProfile({
        command: 'npm install lodash',
        cwd: mockCwd,
        workspaces: [mockWorkspace],
        provenance: ['model_suggestion'],
      });

      const result = computeMinimumReviewLevel(profile);

      // Level B: write + network inside workspace
      expect(result.level).toBe('B');
      expect(result.requiresClick).toBe(true);
      expect(result.requiresPin).toBe(false);
    });
  });

  describe('PIN verification implementation', () => {
    it('simulates correct PIN verification flow', () => {
      const configuredPin = '123456';
      const userEnteredPin = '123456';

      // This simulates the logic in shell.ts onConfirm callback
      function verifyPin(
        enteredPin: string | undefined,
        requiresPin: boolean,
      ): boolean {
        if (requiresPin) {
          if (!enteredPin) {
            throw new Error('PIN required for Level C action');
          }
          if (enteredPin !== configuredPin) {
            throw new Error('Incorrect PIN');
          }
        }
        return true;
      }

      // Level C command requires PIN
      expect(() => verifyPin(userEnteredPin, true)).not.toThrow();
    });

    it('simulates incorrect PIN verification flow', () => {
      const configuredPin = '123456';
      const wrongPin = '000000';

      function verifyPin(
        enteredPin: string | undefined,
        requiresPin: boolean,
      ): boolean {
        if (requiresPin) {
          if (!enteredPin) {
            throw new Error('PIN required for Level C action');
          }
          if (enteredPin !== configuredPin) {
            throw new Error('Incorrect PIN');
          }
        }
        return true;
      }

      expect(() => verifyPin(wrongPin, true)).toThrow('Incorrect PIN');
    });

    it('simulates missing PIN verification flow', () => {
      const configuredPin = '123456';

      function verifyPin(
        enteredPin: string | undefined,
        requiresPin: boolean,
      ): boolean {
        if (requiresPin) {
          if (!enteredPin) {
            throw new Error('PIN required for Level C action');
          }
          if (enteredPin !== configuredPin) {
            throw new Error('Incorrect PIN');
          }
        }
        return true;
      }

      expect(() => verifyPin(undefined, true)).toThrow(
        'PIN required for Level C action',
      );
    });

    it('allows execution without PIN for Level A/B', () => {
      function verifyPin(
        enteredPin: string | undefined,
        requiresPin: boolean,
      ): boolean {
        if (requiresPin) {
          if (!enteredPin) {
            throw new Error('PIN required for Level C action');
          }
          if (enteredPin !== '123456') {
            throw new Error('Incorrect PIN');
          }
        }
        return true;
      }

      // Level A/B don't require PIN
      expect(() => verifyPin(undefined, false)).not.toThrow();
    });
  });
});
