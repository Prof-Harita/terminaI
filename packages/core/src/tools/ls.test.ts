/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { LSTool } from './ls.js';
import type { Config } from '../config/config.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { ToolErrorType } from './tool-error.js';
import { WorkspaceContext } from '../utils/workspaceContext.js';

describe('LSTool', () => {
  let lsTool: LSTool;
  let tempRootDir: string;
  let tempSecondaryDir: string;
  let mockConfig: Config;
  const abortSignal = new AbortController().signal;

  beforeEach(async () => {
    const realTmp = await fs.realpath(os.tmpdir());
    tempRootDir = await fs.mkdtemp(path.join(realTmp, 'ls-tool-root-'));
    tempSecondaryDir = await fs.mkdtemp(
      path.join(realTmp, 'ls-tool-secondary-'),
    );

    mockConfig = {
      getTargetDir: () => tempRootDir,
      getWorkspaceContext: () =>
        new WorkspaceContext(tempRootDir, [tempSecondaryDir]),
      getFileService: () => new FileDiscoveryService(tempRootDir),
      getFileFilteringOptions: () => ({
        respectGitIgnore: true,
        respectGeminiIgnore: true,
      }),
    } as unknown as Config;

    lsTool = new LSTool(mockConfig);
  });

  afterEach(async () => {
    await fs.rm(tempRootDir, { recursive: true, force: true });
    await fs.rm(tempSecondaryDir, { recursive: true, force: true });
  });

  describe('parameter validation', () => {
    it('should accept valid absolute paths within workspace', async () => {
      const testPath = path.join(tempRootDir, 'src');
      await fs.mkdir(testPath);

      const invocation = lsTool.build({ dir_path: testPath });

      expect(invocation).toBeDefined();
    });

    it('should accept relative paths', async () => {
      const testPath = path.join(tempRootDir, 'src');
      await fs.mkdir(testPath);

      const relativePath = path.relative(tempRootDir, testPath);
      const invocation = lsTool.build({ dir_path: relativePath });

      expect(invocation).toBeDefined();
    });

    it('should accept paths in secondary workspace directory', async () => {
      const testPath = path.join(tempSecondaryDir, 'lib');
      await fs.mkdir(testPath);

      const invocation = lsTool.build({ dir_path: testPath });

      expect(invocation).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should list files in a directory', async () => {
      await fs.writeFile(path.join(tempRootDir, 'file1.txt'), 'content1');
      await fs.mkdir(path.join(tempRootDir, 'subdir'));
      await fs.writeFile(
        path.join(tempSecondaryDir, 'secondary-file.txt'),
        'secondary',
      );

      const invocation = lsTool.build({ dir_path: tempRootDir });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('[DIR] subdir');
      expect(result.llmContent).toContain('file1.txt');
      expect(result.returnDisplay).toBe('Listed 2 item(s)');
    });

    it('should list files from secondary workspace directory', async () => {
      await fs.writeFile(path.join(tempRootDir, 'file1.txt'), 'content1');
      await fs.mkdir(path.join(tempRootDir, 'subdir'));
      await fs.writeFile(
        path.join(tempSecondaryDir, 'secondary-file.txt'),
        'secondary',
      );

      const invocation = lsTool.build({ dir_path: tempSecondaryDir });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('secondary-file.txt');
      expect(result.returnDisplay).toBe('Listed 1 item(s)');
    });

    it('should handle empty directories', async () => {
      const emptyDir = path.join(tempRootDir, 'empty');
      await fs.mkdir(emptyDir);
      const invocation = lsTool.build({ dir_path: emptyDir });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toBe(`Directory ${emptyDir} is empty.`);
      expect(result.returnDisplay).toBe('Directory is empty.');
    });

    it('should respect ignore patterns', async () => {
      await fs.writeFile(path.join(tempRootDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempRootDir, 'file2.log'), 'content1');

      const invocation = lsTool.build({
        dir_path: tempRootDir,
        ignore: ['*.log'],
      });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('file1.txt');
      expect(result.llmContent).not.toContain('file2.log');
      expect(result.returnDisplay).toBe('Listed 1 item(s)');
    });

    it('should respect gitignore patterns', async () => {
      await fs.writeFile(path.join(tempRootDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempRootDir, 'file2.log'), 'content1');
      await fs.writeFile(path.join(tempRootDir, '.git'), '');
      await fs.writeFile(path.join(tempRootDir, '.gitignore'), '*.log');
      const invocation = lsTool.build({ dir_path: tempRootDir });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('file1.txt');
      expect(result.llmContent).not.toContain('file2.log');
      // .git is always ignored by default.
      expect(result.returnDisplay).toBe('Listed 2 item(s) (2 ignored)');
    });

    it('should respect geminiignore patterns', async () => {
      await fs.writeFile(path.join(tempRootDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempRootDir, 'file2.log'), 'content1');
      await fs.writeFile(path.join(tempRootDir, '.geminiignore'), '*.log');
      const invocation = lsTool.build({ dir_path: tempRootDir });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('file1.txt');
      expect(result.llmContent).not.toContain('file2.log');
      expect(result.returnDisplay).toBe('Listed 2 item(s) (1 ignored)');
    });

    it('should handle non-directory paths', async () => {
      const testPath = path.join(tempRootDir, 'file1.txt');
      await fs.writeFile(testPath, 'content1');

      const invocation = lsTool.build({ dir_path: testPath });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Path is not a directory');
      expect(result.returnDisplay).toBe('Error: Path is not a directory.');
      expect(result.error?.type).toBe(ToolErrorType.PATH_IS_NOT_A_DIRECTORY);
    });

    it('should handle non-existent paths', async () => {
      const testPath = path.join(tempRootDir, 'does-not-exist');
      const invocation = lsTool.build({ dir_path: testPath });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Error listing directory');
      expect(result.returnDisplay).toBe('Error: Failed to list directory.');
      expect(result.error?.type).toBe(ToolErrorType.LS_EXECUTION_ERROR);
    });

    it('should sort directories first, then files alphabetically', async () => {
      await fs.writeFile(path.join(tempRootDir, 'a-file.txt'), 'content1');
      await fs.writeFile(path.join(tempRootDir, 'b-file.txt'), 'content1');
      await fs.mkdir(path.join(tempRootDir, 'x-dir'));
      await fs.mkdir(path.join(tempRootDir, 'y-dir'));

      const invocation = lsTool.build({ dir_path: tempRootDir });
      const result = await invocation.execute(abortSignal);

      const lines = (
        typeof result.llmContent === 'string' ? result.llmContent : ''
      )
        .split('\n')
        .filter(Boolean);
      const entries = lines.slice(1); // Skip header

      expect(entries[0]).toBe('[DIR] x-dir');
      expect(entries[1]).toBe('[DIR] y-dir');
      expect(entries[2]).toBe('a-file.txt');
      expect(entries[3]).toBe('b-file.txt');
    });

    it('should handle permission errors gracefully', async () => {
      const restrictedDir = path.join(tempRootDir, 'restricted');
      await fs.mkdir(restrictedDir);

      // To simulate a permission error in a cross-platform way,
      // we mock fs.readdir to throw an error.
      const error = new Error('EACCES: permission denied');
      vi.spyOn(fs, 'readdir').mockRejectedValueOnce(error);

      const invocation = lsTool.build({ dir_path: restrictedDir });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('Error listing directory');
      expect(result.llmContent).toContain('permission denied');
      expect(result.returnDisplay).toBe('Error: Failed to list directory.');
      expect(result.error?.type).toBe(ToolErrorType.LS_EXECUTION_ERROR);
    });

    it('should handle errors accessing individual files during listing', async () => {
      await fs.writeFile(path.join(tempRootDir, 'file1.txt'), 'content1');
      const problematicFile = path.join(tempRootDir, 'problematic.txt');
      await fs.writeFile(problematicFile, 'content2');

      // To simulate an error on a single file in a cross-platform way,
      // we mock fs.stat to throw for a specific file. This avoids
      // platform-specific behavior with things like dangling symlinks.
      const originalStat = fs.stat;
      const statSpy = vi.spyOn(fs, 'stat').mockImplementation(async (p) => {
        if (p.toString() === problematicFile) {
          throw new Error('Simulated stat error');
        }
        return originalStat(p);
      });

      const invocation = lsTool.build({ dir_path: tempRootDir });
      const result = await invocation.execute(abortSignal);

      // Should still list the other files
      expect(result.llmContent).toContain('file1.txt');
      expect(result.llmContent).not.toContain('problematic.txt');
      expect(result.returnDisplay).toBe('Listed 1 item(s)');

      statSpy.mockRestore();
    });
  });

  describe('getDescription', () => {
    it('should return shortened relative path', () => {
      const deeplyNestedDir = path.join(tempRootDir, 'deeply', 'nested');
      const params = {
        dir_path: path.join(deeplyNestedDir, 'directory'),
      };
      const invocation = lsTool.build(params);
      const description = invocation.getDescription();
      expect(description).toBe(path.join('deeply', 'nested', 'directory'));
    });

    it('should handle paths in secondary workspace', () => {
      const params = {
        dir_path: path.join(tempSecondaryDir, 'lib'),
      };
      const invocation = lsTool.build(params);
      const description = invocation.getDescription();
      const expected = path.relative(tempRootDir, params.dir_path);
      expect(description).toBe(expected);
    });
  });

  describe('workspace boundary validation', () => {
    it('should accept paths in primary workspace directory', async () => {
      const testPath = path.join(tempRootDir, 'src');
      await fs.mkdir(testPath);
      const params = { dir_path: testPath };
      expect(lsTool.build(params)).toBeDefined();
    });

    it('should accept paths in secondary workspace directory', async () => {
      const testPath = path.join(tempSecondaryDir, 'lib');
      await fs.mkdir(testPath);
      const params = { dir_path: testPath };
      expect(lsTool.build(params)).toBeDefined();
    });

    it('should list files from secondary workspace directory', async () => {
      await fs.writeFile(
        path.join(tempSecondaryDir, 'secondary-file.txt'),
        'secondary',
      );

      const invocation = lsTool.build({ dir_path: tempSecondaryDir });
      const result = await invocation.execute(abortSignal);

      expect(result.llmContent).toContain('secondary-file.txt');
      expect(result.returnDisplay).toBe('Listed 1 item(s)');
    });
  });
  describe('pagination', () => {
    it('should paginate results', async () => {
      // Create 10 files
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(
          path.join(tempRootDir, `file${i}.txt`),
          `content${i}`,
        );
      }

      // First page (Limit 4)
      const inv1 = lsTool.build({ dir_path: tempRootDir, limit: 4, offset: 0 });
      const res1 = await inv1.execute(abortSignal);

      expect(res1.llmContent).toContain('file0.txt');
      expect(res1.llmContent).toContain('file3.txt');
      expect(res1.llmContent).not.toContain('file4.txt');
      expect(res1.llmContent).toContain('(Showing 1-4 of 10)');
      expect(res1.llmContent).toContain(
        '(6 more items. Use offset=4 to see more)',
      );

      // Second page (Offset 4, Limit 4)
      const inv2 = lsTool.build({ dir_path: tempRootDir, limit: 4, offset: 4 });
      const res2 = await inv2.execute(abortSignal);

      expect(res2.llmContent).toContain('file4.txt');
      expect(res2.llmContent).toContain('file7.txt');
      expect(res2.llmContent).not.toContain('file3.txt');
      expect(res2.llmContent).not.toContain('file8.txt');
      expect(res2.llmContent).toContain('(Showing 5-8 of 10)');
      expect(res2.llmContent).toContain(
        '(2 more items. Use offset=8 to see more)',
      );

      // Third page (Offset 8, Limit 4) - partial page
      const inv3 = lsTool.build({ dir_path: tempRootDir, limit: 4, offset: 8 });
      const res3 = await inv3.execute(abortSignal);

      expect(res3.llmContent).toContain('file8.txt');
      expect(res3.llmContent).toContain('file9.txt');
      expect(res3.llmContent).toContain('(Showing 9-10 of 10)');
      // Should not show "more items" message
      expect(res3.llmContent).not.toContain('more items');
    });

    it('should handle offset larger than total', async () => {
      await fs.writeFile(path.join(tempRootDir, 'file1.txt'), 'content1');
      const inv = lsTool.build({
        dir_path: tempRootDir,
        offset: 10,
        limit: 10,
      });
      const res = await inv.execute(abortSignal);

      expect(res.llmContent).toContain('Directory listing for');
      expect(res.returnDisplay).toBe('Listed 0 item(s) (Total: 1)');
    });

    it('should clamp limit to MAX_LIMIT (1000)', async () => {
      // Create 1001 files (just enough to test limit)
      // We mock fs.readdir to avoid creating actual files which is slow/flaky
      // We need to spy on fs.readdir and fs.stat
      const manyFiles = Array.from({ length: 1005 }, (_, i) => `file${i}.txt`);

      vi.spyOn(fs, 'readdir').mockResolvedValue(manyFiles as any);
      vi.spyOn(fs, 'stat').mockImplementation(async (p) => {
        const pathStr = p.toString();
        if (pathStr === tempRootDir) {
          return {
            isDirectory: () => true,
            mtime: new Date(),
          } as any;
        }
        return {
          isDirectory: () => false,
          size: 100,
          mtime: new Date(),
        } as any;
      });

      // Force a large limit
      const inv = lsTool.build({
        dir_path: tempRootDir,
        limit: 5000,
      });
      const res = await inv.execute(abortSignal);

      // Should show 1-1000
      expect(res.llmContent).toContain('(Showing 1-1000 of 1005)');
      expect(res.llmContent).toContain(
        '(5 more items. Use offset=1000 to see more)',
      );
      expect(res.returnDisplay).toBe('Listed 1000 item(s) (Total: 1005)');

      vi.restoreAllMocks();
    });
  });
});
