/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { MemoryTool, MEMORY_SECTION_HEADER } from '../memoryTool.js';
import * as path from 'node:path';

// Mock fs and diff
vi.mock('node:fs/promises');
vi.mock('node:path');

describe('MemoryTool Deduplication', () => {
  const mockFs = fs as unknown as {
    readFile: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
    mkdir: ReturnType<typeof vi.fn>;
  };

  const mockPath = path as unknown as {
    join: ReturnType<typeof vi.fn>;
    dirname: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockPath.dirname.mockReturnValue('/mock/dir');
  });

  it('should not add duplicate fact if it already exists', async () => {
    const existingContent = `${MEMORY_SECTION_HEADER}\n- existing fact\n`;
    const fact = 'existing fact';
    const filePath = '/mock/file.md';

    mockFs.readFile.mockResolvedValue(existingContent);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    await MemoryTool.performAddMemoryEntry(fact, filePath, {
      readFile: mockFs.readFile as unknown as (
        path: string,
        encoding: 'utf-8',
      ) => Promise<string>,
      writeFile: mockFs.writeFile as unknown as (
        path: string,
        data: string,
        encoding: 'utf-8',
      ) => Promise<void>,
      mkdir: mockFs.mkdir as unknown as (
        path: string,
        options: { recursive: boolean },
      ) => Promise<string | undefined>,
    });

    // writeFile should be called with the SAME content if duplicate
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      filePath,
      existingContent, // Expect no change (or at least no new item appended)
      'utf-8',
    );
  });

  it('should add new fact if it does not exist', async () => {
    const existingContent = `${MEMORY_SECTION_HEADER}\n- existing fact\n`;
    const fact = 'new fact';
    const filePath = '/mock/file.md';

    mockFs.readFile.mockResolvedValue(existingContent);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    await MemoryTool.performAddMemoryEntry(fact, filePath, {
      readFile: mockFs.readFile as unknown as (
        path: string,
        encoding: 'utf-8',
      ) => Promise<string>,
      writeFile: mockFs.writeFile as unknown as (
        path: string,
        data: string,
        encoding: 'utf-8',
      ) => Promise<void>,
      mkdir: mockFs.mkdir as unknown as (
        path: string,
        options: { recursive: boolean },
      ) => Promise<string | undefined>,
    });

    // writeFile should be called with updated content
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      filePath,
      expect.stringContaining(
        `${MEMORY_SECTION_HEADER}\n- existing fact\n- new fact`,
      ),
      'utf-8',
    );
  });
});
