/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ShellTool } from '../shell.js';
import { Config } from '../../config/config.js';
import { initializeShellParsers } from '../../utils/shell-utils.js';
import * as os from 'node:os';
import * as path from 'node:path';

describe.skipIf(process.platform === 'win32')(
  'ShellTool System Operator Regression',
  () => {
    beforeAll(async () => {
      await initializeShellParsers();
    });

    const targetDir = '/home/user/project';

    it('should allow access to common directories in system operator mode', () => {
      const config = new Config({
        sessionId: 'test',
        targetDir,
        systemOperatorMode: true,
        debugMode: false,
        cwd: '/tmp',
        model: 'test-model',
      });

      const tool = new ShellTool(config);
      const homePath = os.homedir();
      const downloadsPath = path.join(homePath, 'Downloads');

      // Should NOT throw
      expect(() =>
        tool.build({
          command: 'ls',
          dir_path: downloadsPath,
        }),
      ).not.toThrow();
    });

    it('should block access outside workspace in normal mode', () => {
      const config = new Config({
        sessionId: 'test',
        targetDir,
        systemOperatorMode: false,
        debugMode: false,
        cwd: '/tmp',
        model: 'test-model',
      });

      const tool = new ShellTool(config);
      const homePath = os.homedir();

      // Should throw
      expect(() =>
        tool.build({
          command: 'ls',
          dir_path: homePath,
        }),
      ).toThrow(/is not within any of the registered workspace directories/);
    });
  },
);
