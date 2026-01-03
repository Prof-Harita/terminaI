/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';

// Import functions to test
import { findFileDeps, pinFileDeps } from '../releasing/pin-internal-deps.js';

describe('pin-internal-deps', () => {
  describe('findFileDeps', () => {
    it('should find file: dependencies in dependencies field', () => {
      const pkg = {
        name: '@terminai/cli',
        dependencies: {
          '@terminai/core': 'file:../core',
          lodash: '^4.17.21',
        },
      };

      const found = findFileDeps(pkg);
      expect(found).toHaveLength(1);
      expect(found[0]).toEqual({
        field: 'dependencies',
        name: '@terminai/core',
        value: 'file:../core',
      });
    });

    it('should find file: dependencies across multiple fields', () => {
      const pkg = {
        name: '@terminai/cli',
        dependencies: {
          '@terminai/core': 'file:../core',
        },
        optionalDependencies: {
          '@terminai/a2a-server': 'file:../a2a-server',
        },
      };

      const found = findFileDeps(pkg);
      expect(found).toHaveLength(2);
    });

    it('should ignore non-internal file: dependencies', () => {
      const pkg = {
        name: '@terminai/cli',
        dependencies: {
          'some-local-pkg': 'file:../some-local',
        },
      };

      const found = findFileDeps(pkg);
      expect(found).toHaveLength(0);
    });

    it('should return empty array when no file: deps exist', () => {
      const pkg = {
        name: '@terminai/cli',
        dependencies: {
          '@terminai/core': '^1.0.0',
          lodash: '^4.17.21',
        },
      };

      const found = findFileDeps(pkg);
      expect(found).toHaveLength(0);
    });
  });

  describe('pinFileDeps', () => {
    it('should replace file: deps with exact version', () => {
      const pkg = {
        name: '@terminai/cli',
        dependencies: {
          '@terminai/core': 'file:../core',
          lodash: '^4.17.21',
        },
      };

      const { pkg: pinned, changed } = pinFileDeps(pkg, '1.2.3');
      expect(changed).toBe(true);
      expect(pinned.dependencies['@terminai/core']).toBe('1.2.3');
      expect(pinned.dependencies['lodash']).toBe('^4.17.21');
    });

    it('should not modify non-file deps', () => {
      const pkg = {
        name: '@terminai/cli',
        dependencies: {
          '@terminai/core': '^1.0.0',
        },
      };

      const { pkg: pinned, changed } = pinFileDeps(pkg, '1.2.3');
      expect(changed).toBe(false);
      expect(pinned.dependencies['@terminai/core']).toBe('^1.0.0');
    });

    it('should handle multiple dependency fields', () => {
      const pkg = {
        name: '@terminai/cli',
        dependencies: {
          '@terminai/core': 'file:../core',
        },
        peerDependencies: {
          '@terminai/a2a-server': 'file:../a2a-server',
        },
      };

      const { pkg: pinned, changed } = pinFileDeps(pkg, '2.0.0');
      expect(changed).toBe(true);
      expect(pinned.dependencies['@terminai/core']).toBe('2.0.0');
      expect(pinned.peerDependencies['@terminai/a2a-server']).toBe('2.0.0');
    });

    it('should not mutate the original package object', () => {
      const pkg = {
        name: '@terminai/cli',
        dependencies: {
          '@terminai/core': 'file:../core',
        },
      };

      pinFileDeps(pkg, '1.0.0');
      expect(pkg.dependencies['@terminai/core']).toBe('file:../core');
    });
  });
});
