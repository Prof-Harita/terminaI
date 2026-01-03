/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cross-platform SHA256 checksum generator for release artifacts.
 * Produces output in standard `sha256sum` format: `<hash>  <filename>`
 *
 * Usage:
 *   node scripts/releasing/generate-sha256sums.js <file1> [file2] ...
 *   node scripts/releasing/generate-sha256sums.js --output SHA256SUMS <file1> ...
 */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Calculate SHA256 hash of a file.
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Hex-encoded SHA256 hash
 */
async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Generate SHA256 checksums for multiple files.
 * @param {string[]} filePaths - Array of file paths
 * @returns {Promise<Array<{file: string, hash: string, basename: string}>>}
 */
export async function generateSha256sums(filePaths) {
  const results = [];

  for (const filePath of filePaths) {
    try {
      const hash = await sha256File(filePath);
      results.push({
        file: filePath,
        basename: path.basename(filePath),
        hash,
      });
    } catch (error) {
      throw new Error(`Failed to hash ${filePath}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Format results as standard SHA256SUMS content.
 * @param {Array<{basename: string, hash: string}>} results
 * @returns {string}
 */
export function formatSha256sums(results) {
  return results.map((r) => `${r.hash}  ${r.basename}`).join('\n') + '\n';
}

// CLI entrypoint
async function main() {
  const args = process.argv.slice(2);
  let outputFile = null;
  const files = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      outputFile = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`Usage: node generate-sha256sums.js [--output FILE] <file1> [file2] ...

Options:
  --output, -o FILE   Write output to FILE instead of stdout
  --help, -h          Show this help message

Output format (standard sha256sum):
  <sha256hash>  <filename>
`);
      process.exit(0);
    } else {
      files.push(args[i]);
    }
  }

  if (files.length === 0) {
    console.error('Error: No files specified');
    process.exit(1);
  }

  try {
    const results = await generateSha256sums(files);
    const output = formatSha256sums(results);

    if (outputFile) {
      await fs.writeFile(outputFile, output);
      console.log(`SHA256SUMS written to ${outputFile}`);
    } else {
      process.stdout.write(output);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
