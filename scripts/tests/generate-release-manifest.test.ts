/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateReleaseManifest } from '../releasing/generate-release-manifest.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('generate-release-manifest', () => {
  let tempDir: string;
  let testDeb: string;
  let testMsi: string;

  beforeAll(async () => {
    // Create temp directory with fake installer files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-test-'));
    testDeb = path.join(tempDir, 'terminai_0.21.0_amd64.deb');
    testMsi = path.join(tempDir, 'terminai-0.21.0-x64.msi');

    await fs.writeFile(testDeb, 'fake deb content');
    await fs.writeFile(testMsi, 'fake msi content');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('generates manifest with version and assets', async () => {
    const checksums = new Map([
      ['terminai_0.21.0_amd64.deb', 'abc123'],
      ['terminai-0.21.0-x64.msi', 'def456'],
    ]);

    const manifest = await generateReleaseManifest(
      '0.21.0',
      [testDeb, testMsi],
      checksums,
    );

    expect(manifest.version).toBe('0.21.0');
    expect(manifest.createdAt).toBeDefined();
    expect(manifest.assets).toHaveLength(2);
  });

  it('correctly infers platform from .deb files', async () => {
    const manifest = await generateReleaseManifest(
      '0.21.0',
      [testDeb],
      new Map(),
    );

    expect(manifest.assets[0].platform).toBe('linux');
  });

  it('correctly infers platform from .msi files', async () => {
    const manifest = await generateReleaseManifest(
      '0.21.0',
      [testMsi],
      new Map(),
    );

    expect(manifest.assets[0].platform).toBe('windows');
  });

  it('includes file size in bytes', async () => {
    const manifest = await generateReleaseManifest(
      '0.21.0',
      [testDeb],
      new Map(),
    );

    expect(manifest.assets[0].sizeBytes).toBe(16); // "fake deb content".length
  });

  it('includes sha256 from checksums map', async () => {
    const checksums = new Map([
      ['terminai_0.21.0_amd64.deb', 'sha256hashvalue'],
    ]);
    const manifest = await generateReleaseManifest(
      '0.21.0',
      [testDeb],
      checksums,
    );

    expect(manifest.assets[0].sha256).toBe('sha256hashvalue');
  });

  it('sets sha256 to null when not in checksums', async () => {
    const manifest = await generateReleaseManifest(
      '0.21.0',
      [testDeb],
      new Map(),
    );

    expect(manifest.assets[0].sha256).toBeNull();
  });
});
