/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generate release-manifest.json for GitHub Releases.
 * Produces a JSON file with version and asset metadata.
 *
 * Usage:
 *   node scripts/releasing/generate-release-manifest.js --version <version> --sha256sums <SHA256SUMS> --output release-manifest.json <file1> [file2] ...
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Parse a SHA256SUMS file into a map of filename -> hash.
 * @param {string} content - Content of SHA256SUMS file
 * @returns {Map<string, string>}
 */
function parseSha256sums(content) {
  const map = new Map();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Format: "hash  filename" (two spaces)
    const match = trimmed.match(/^([a-f0-9]{64})\s{1,2}(.+)$/);
    if (match) {
      map.set(match[2], match[1]);
    }
  }
  return map;
}

/**
 * Infer platform and architecture from filename.
 * @param {string} filename
 * @returns {{platform: string, arch: string}}
 */
function inferPlatformArch(filename) {
  const lower = filename.toLowerCase();

  let platform = 'unknown';
  let arch = 'unknown';

  // Platform detection
  if (
    lower.includes('linux') ||
    lower.endsWith('.deb') ||
    lower.endsWith('.appimage')
  ) {
    platform = 'linux';
  } else if (
    lower.includes('windows') ||
    lower.endsWith('.msi') ||
    lower.endsWith('.exe')
  ) {
    platform = 'windows';
  } else if (
    lower.includes('darwin') ||
    lower.includes('macos') ||
    lower.endsWith('.dmg')
  ) {
    platform = 'macos';
  }

  // Architecture detection
  if (
    lower.includes('x86_64') ||
    lower.includes('x64') ||
    lower.includes('amd64')
  ) {
    arch = 'x64';
  } else if (lower.includes('aarch64') || lower.includes('arm64')) {
    arch = 'arm64';
  } else if (
    lower.includes('i686') ||
    lower.includes('x86') ||
    lower.includes('i386')
  ) {
    arch = 'x86';
  }

  return { platform, arch };
}

/**
 * Generate release manifest from files and checksums.
 * @param {string} version - Release version
 * @param {string[]} filePaths - Array of asset file paths
 * @param {Map<string, string>} checksums - Map of filename -> sha256
 * @returns {Promise<object>}
 */
export async function generateReleaseManifest(version, filePaths, checksums) {
  const assets = [];

  for (const filePath of filePaths) {
    const basename = path.basename(filePath);
    const stat = await fs.stat(filePath);
    const sha256 = checksums.get(basename) || null;
    const { platform, arch } = inferPlatformArch(basename);

    assets.push({
      name: basename,
      sizeBytes: stat.size,
      sha256,
      platform,
      arch,
    });
  }

  return {
    version,
    createdAt: new Date().toISOString(),
    assets,
  };
}

// CLI entrypoint
async function main() {
  const args = process.argv.slice(2);
  let version = null;
  let sha256sumsFile = null;
  let outputFile = 'release-manifest.json';
  const files = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version' || args[i] === '-v') {
      version = args[++i];
    } else if (args[i] === '--sha256sums' || args[i] === '-s') {
      sha256sumsFile = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      outputFile = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`Usage: node generate-release-manifest.js [options] <file1> [file2] ...

Options:
  --version, -v VERSION      Release version (required)
  --sha256sums, -s FILE      Path to SHA256SUMS file
  --output, -o FILE          Output file (default: release-manifest.json)
  --help, -h                 Show this help message

Output: JSON with version, createdAt, and assets array including:
  - name, sizeBytes, sha256, platform, arch
`);
      process.exit(0);
    } else {
      files.push(args[i]);
    }
  }

  if (!version) {
    console.error('Error: --version is required');
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('Error: No files specified');
    process.exit(1);
  }

  try {
    // Load checksums if provided
    let checksums = new Map();
    if (sha256sumsFile) {
      const content = await fs.readFile(sha256sumsFile, 'utf-8');
      checksums = parseSha256sums(content);
    }

    const manifest = await generateReleaseManifest(version, files, checksums);
    const output = JSON.stringify(manifest, null, 2) + '\n';

    await fs.writeFile(outputFile, output);
    console.log(`Release manifest written to ${outputFile}`);
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
