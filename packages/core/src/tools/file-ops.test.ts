/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { Config } from '../config/config.js';
import { DEFAULT_FILE_FILTERING_OPTIONS } from '../config/constants.js';
import { createMockWorkspaceContext } from '../test-utils/mockWorkspaceContext.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { FileOpsTool, type FileOpsToolParams } from './file-ops.js';
import { ToolErrorType } from './tool-error.js';

describe('FileOpsTool', () => {
  let tempRootDir: string;
  let tool: FileOpsTool;
  let mockConfig: Config;

  beforeEach(async () => {
    tempRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-ops-root-'));
    mockConfig = {
      getTargetDir: () => tempRootDir,
      getWorkspaceContext: () => createMockWorkspaceContext(tempRootDir),
      getFileService: () => new FileDiscoveryService(tempRootDir),
      getFileFilteringOptions: () => DEFAULT_FILE_FILTERING_OPTIONS,
      getPreviewMode: () => false,
    } as unknown as Config;
    tool = new FileOpsTool(mockConfig);
  });

  afterEach(async () => {
    await fs.rm(tempRootDir, { recursive: true, force: true });
  });

  it('should create a directory with mkdir', async () => {
    const params: FileOpsToolParams = {
      operation: 'mkdir',
      path: 'new-dir',
      parents: false,
    };
    const invocation = tool.build(params);
    const result = await invocation.execute(new AbortController().signal);
    const createdPath = path.join(tempRootDir, 'new-dir');
    const stats = await fs.stat(createdPath);
    expect(stats.isDirectory()).toBe(true);
    expect(result.returnDisplay).toContain('Created directory');
  });

  it('should move a file', async () => {
    const sourcePath = path.join(tempRootDir, 'source.txt');
    await fs.writeFile(sourcePath, 'hello');
    const params: FileOpsToolParams = {
      operation: 'move',
      from: 'source.txt',
      to: 'dest.txt',
    };
    const invocation = tool.build(params);
    const result = await invocation.execute(new AbortController().signal);
    await expect(fs.stat(sourcePath)).rejects.toThrow();
    const destStats = await fs.stat(path.join(tempRootDir, 'dest.txt'));
    expect(destStats.isFile()).toBe(true);
    expect(result.returnDisplay).toContain('Moved');
  });

  it('should copy a file', async () => {
    const sourcePath = path.join(tempRootDir, 'source.txt');
    await fs.writeFile(sourcePath, 'hello');
    const params: FileOpsToolParams = {
      operation: 'copy',
      from: 'source.txt',
      to: 'copy.txt',
    };
    const invocation = tool.build(params);
    const result = await invocation.execute(new AbortController().signal);
    const copyStats = await fs.stat(path.join(tempRootDir, 'copy.txt'));
    expect(copyStats.isFile()).toBe(true);
    expect(result.returnDisplay).toContain('Copied');
  });

  it('should require recursive=true to copy a directory', async () => {
    const dirPath = path.join(tempRootDir, 'dir');
    await fs.mkdir(dirPath);
    await fs.writeFile(path.join(dirPath, 'a.txt'), 'hello');
    const params: FileOpsToolParams = {
      operation: 'copy',
      from: 'dir',
      to: 'dir-copy',
    };
    const invocation = tool.build(params);
    const result = await invocation.execute(new AbortController().signal);
    expect(result.error?.type).toBe(ToolErrorType.INVALID_TOOL_PARAMS);
    expect(result.llmContent).toContain('recursive=true');
  });

  it('should delete a file', async () => {
    const filePath = path.join(tempRootDir, 'delete-me.txt');
    await fs.writeFile(filePath, 'bye');
    const params: FileOpsToolParams = {
      operation: 'delete',
      path: 'delete-me.txt',
    };
    const invocation = tool.build(params);
    const result = await invocation.execute(new AbortController().signal);
    await expect(fs.stat(filePath)).rejects.toThrow();
    expect(result.returnDisplay).toContain('Deleted');
  });

  it('should require recursive=true to delete a directory', async () => {
    const dirPath = path.join(tempRootDir, 'dir-to-delete');
    await fs.mkdir(dirPath);
    const params: FileOpsToolParams = {
      operation: 'delete',
      path: 'dir-to-delete',
    };
    const invocation = tool.build(params);
    const result = await invocation.execute(new AbortController().signal);
    expect(result.error?.type).toBe(ToolErrorType.INVALID_TOOL_PARAMS);
    expect(result.llmContent).toContain('recursive=true');
  });

  it('should list a tree with maxDepth', async () => {
    await fs.mkdir(path.join(tempRootDir, 'root'));
    await fs.mkdir(path.join(tempRootDir, 'root', 'nested'));
    await fs.writeFile(path.join(tempRootDir, 'root', 'file.txt'), 'hello');
    await fs.writeFile(
      path.join(tempRootDir, 'root', 'nested', 'deep.txt'),
      'deep',
    );

    const params: FileOpsToolParams = {
      operation: 'list_tree',
      path: 'root',
      maxDepth: 1,
    };
    const invocation = tool.build(params);
    const result = await invocation.execute(new AbortController().signal);
    expect(result.llmContent).toContain('Tree for');
    expect(result.llmContent).toContain('file.txt');
    expect(result.llmContent).not.toContain('deep.txt');
  });

  it('returns preview output without touching the file system', async () => {
    (
      mockConfig as unknown as { getPreviewMode: () => boolean }
    ).getPreviewMode = () => true;
    tool = new FileOpsTool(mockConfig);
    const params: FileOpsToolParams = {
      operation: 'mkdir',
      path: 'preview-dir',
    };
    const invocation = tool.build(params);
    const result = await invocation.execute(new AbortController().signal);
    expect(result.returnDisplay).toContain('[PREVIEW]');
    await expect(
      fs.stat(path.join(tempRootDir, 'preview-dir')),
    ).rejects.toThrow();
  });
});
