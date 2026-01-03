/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateSha256sums,
  formatSha256sums,
} from '../releasing/generate-sha256sums.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('generate-sha256sums', () => {
  let tempDir: string;
  let testFile1: string;
  let testFile2: string;

  beforeAll(async () => {
    // Create temp directory with test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sha256-test-'));
    testFile1 = path.join(tempDir, 'test1.txt');
    testFile2 = path.join(tempDir, 'test2.txt');

    await fs.writeFile(testFile1, 'hello world\n');
    await fs.writeFile(testFile2, 'foo bar baz\n');
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('generates correct SHA256 hash for known content', async () => {
    const results = await generateSha256sums([testFile1]);

    expect(results).toHaveLength(1);
    expect(results[0].basename).toBe('test1.txt');
    expect(results[0].hash).toBe(
      'a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447',
    );
  });

  it('generates hashes for multiple files', async () => {
    const results = await generateSha256sums([testFile1, testFile2]);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.basename)).toContain('test1.txt');
    expect(results.map((r) => r.basename)).toContain('test2.txt');
  });

  it('formats output in standard sha256sum format', async () => {
    const results = await generateSha256sums([testFile1]);
    const formatted = formatSha256sums(results);

    // Standard format: "hash  filename\n" (two spaces between)
    expect(formatted).toMatch(/^[a-f0-9]{64} {2}test1\.txt\n$/);
  });

  it('throws error for non-existent file', async () => {
    await expect(generateSha256sums(['/nonexistent/file.txt'])).rejects.toThrow(
      'Failed to hash',
    );
  });
});
