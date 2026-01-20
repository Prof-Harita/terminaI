/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import cliPkgJson from '../../package.json' with { type: 'json' };

// Skip this test suite in CI unless TERMINAI_RUN_DOCKER_E2E=1 is set
const shouldSkip =
  process.env['CI'] === 'true' &&
  process.env['TERMINAI_RUN_DOCKER_E2E'] !== '1';

describe.skipIf(shouldSkip)('Sandbox E2E Scenario: Cleanup Downloads', () => {
  const tempDir = path.join(os.tmpdir(), `terminai-e2e-${Date.now()}`);
  // Derive image from package.json to ensure version consistency
  const image = cliPkgJson.config.sandboxImageUri;

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should correctly classify files when run inside sandbox', () => {
    // 1. Prepare files on host
    const transitFile = path.join(tempDir, 'data.tmp');
    const keepFile = path.join(tempDir, 'results.csv');
    const unknownFile = path.join(tempDir, 'random.txt');

    fs.writeFileSync(transitFile, 'temp data');
    fs.writeFileSync(keepFile, 'permanent data');
    fs.writeFileSync(unknownFile, 'unknown data');

    // 2. Prepare a python script to run inside sandbox
    const pythonScript = `
import json
from terminai_apts.action import cleanup_downloads
from terminai_apts.model import ObjectTableLabels

results = cleanup_downloads('/mnt/downloads', dry_run=True)
# Convert path objects to strings for JSON serialization
serializable = {k: [str(p) for p in v] for k, v in results.items()}
print(json.dumps(serializable))
    `;
    const scriptPath = path.join(tempDir, 'test_cleanup.py');
    fs.writeFileSync(scriptPath, pythonScript);

    // 3. Run sandbox with volume mounts
    try {
      const output = execSync(
        `docker run --rm ` +
          `-v "${tempDir}:/mnt/downloads" ` +
          `"${image}" ` +
          `python3 /mnt/downloads/test_cleanup.py`,
        { encoding: 'utf-8' },
      );

      // Extract JSON from output (container might have noisy entrypoint logs)
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`Could not find JSON in output: ${output}`);
      }
      const result = JSON.parse(jsonMatch[0]);

      // Verification
      // /mnt/downloads contains: data.tmp, results.csv, random.txt, test_cleanup.py
      // Expected classifications:
      // data.tmp -> TRANSIT
      // results.csv -> KEEP
      // random.txt -> UNKNOWN
      // test_cleanup.py -> UNKNOWN

      expect(result['transit']).toContain('/mnt/downloads/data.tmp');
      expect(result['keep']).toContain('/mnt/downloads/results.csv');
      expect(result['unknown']).toContain('/mnt/downloads/random.txt');
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? (e as { stderr?: string }).stderr || e.message
          : String(e);
      console.error('Docker execution failed:', message);
      throw e;
    }
  });
});
