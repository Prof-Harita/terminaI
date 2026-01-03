/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { extractVersionFromTag } from '../releasing/assert-release-version.js';

describe('assert-release-version', () => {
  describe('extractVersionFromTag', () => {
    it('should extract version from standard tag', () => {
      expect(extractVersionFromTag('v1.0.0')).toBe('1.0.0');
      expect(extractVersionFromTag('v0.21.0')).toBe('0.21.0');
      expect(extractVersionFromTag('v10.20.30')).toBe('10.20.30');
    });

    it('should extract version from prerelease tag', () => {
      expect(extractVersionFromTag('v1.0.0-beta.1')).toBe('1.0.0-beta.1');
      expect(extractVersionFromTag('v0.21.0-preview.0')).toBe(
        '0.21.0-preview.0',
      );
      expect(extractVersionFromTag('v1.0.0-nightly.20260101.abc123')).toBe(
        '1.0.0-nightly.20260101.abc123',
      );
    });

    it('should return null for invalid tag format', () => {
      expect(extractVersionFromTag('1.0.0')).toBeNull(); // missing v
      expect(extractVersionFromTag('v1.0')).toBeNull(); // missing patch
      expect(extractVersionFromTag('vX.Y.Z')).toBeNull(); // not numeric
      expect(extractVersionFromTag('')).toBeNull();
      expect(extractVersionFromTag('release-1.0.0')).toBeNull();
    });
  });
});
