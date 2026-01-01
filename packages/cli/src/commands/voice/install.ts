/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  mkdir,
  writeFile,
  readdir,
  copyFile,
  chmod,
  rm,
} from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type { CommandModule } from 'yargs';
import extractZip from 'extract-zip';
import * as tar from 'tar';

// Voice cache directory
const VOICE_CACHE_DIR = join(homedir(), '.terminai', 'voice');

// Download URLs - verified working URLs for offline voice
const WHISPER_MODEL_URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin';

// Platform-specific whisper.cpp binaries
const WHISPER_BINARIES: Record<string, string> = {
  linux:
    'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4/whisper-bin-x64.zip',
  darwin:
    'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4/whisper-bin-x64.zip',
  win32:
    'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4/whisper-bin-Win32.zip',
};

// Piper TTS - using pre-built binaries and voice model
const PIPER_BINARIES: Record<string, string> = {
  linux:
    'https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_linux_x86_64.tar.gz',
  darwin:
    'https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_macos_x86_64.tar.gz',
  win32:
    'https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_windows_amd64.zip',
};

// Default male voice for piper (en_US)
const PIPER_VOICE_URL =
  'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx';
const PIPER_VOICE_CONFIG_URL =
  'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json';

// Helper to create async iterable from web Response
async function* createReadableStreamFromWeb(
  webStream: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  const reader = webStream.getReader();
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        return;
      }
      yield result.value;
    }
  } finally {
    reader.releaseLock();
  }
}

async function downloadFile(url: string, destPath: string, label: string) {
  console.log(`Downloading ${label}...`);
  console.log(`  URL: ${url}`);
  console.log(`  Dest: ${destPath}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${label}: ${response.status} ${response.statusText}`,
    );
  }
  if (!response.body) {
    throw new Error(`No body for ${label}`);
  }

  await pipeline(
    createReadableStreamFromWeb(response.body),
    createWriteStream(destPath),
  );
  console.log(`✓ Downloaded ${label}`);
}

async function findFilesRecursive(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findFilesRecursive(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function pickBinaryPath(files: string[], candidates: string[]): string | null {
  const lowerFiles = files.map((p) => ({
    p,
    base: p.split(/[\\/]/).pop()!.toLowerCase(),
  }));
  for (const name of candidates) {
    const match = lowerFiles.find((f) => f.base === name.toLowerCase());
    if (match) return match.p;
  }
  return null;
}

async function installExecutable(opts: {
  archivePath: string;
  extractDir: string;
  outputPath: string;
  candidateNames: string[];
}) {
  await rm(opts.extractDir, { recursive: true, force: true });
  await mkdir(opts.extractDir, { recursive: true });

  if (opts.archivePath.endsWith('.zip')) {
    await extractZip(opts.archivePath, { dir: opts.extractDir });
  } else if (opts.archivePath.endsWith('.tar.gz')) {
    await tar.x({ file: opts.archivePath, cwd: opts.extractDir });
  } else {
    throw new Error(`Unknown archive type: ${opts.archivePath}`);
  }

  const files = await findFilesRecursive(opts.extractDir);
  const binary = pickBinaryPath(files, opts.candidateNames);
  if (!binary) {
    throw new Error(
      `Could not find expected binary in archive. Looked for: ${opts.candidateNames.join(
        ', ',
      )}`,
    );
  }

  await copyFile(binary, opts.outputPath);
  if (process.platform !== 'win32') {
    await chmod(opts.outputPath, 0o755);
  }
}

export const installCommand: CommandModule = {
  command: 'install',
  describe:
    'Download and install offline voice dependencies (whisper.cpp, piper)',
  handler: async () => {
    console.log('Installing voice dependencies to:', VOICE_CACHE_DIR);
    console.log('');

    try {
      // Create cache directory
      await mkdir(VOICE_CACHE_DIR, { recursive: true });
      console.log('✓ Created voice cache directory');

      const platform = process.platform as keyof typeof WHISPER_BINARIES;
      let whisperBinaryPath: string | null = null;

      // Download whisper model
      const whisperModelPath = join(VOICE_CACHE_DIR, 'ggml-base.en.bin');
      await downloadFile(
        WHISPER_MODEL_URL,
        whisperModelPath,
        'Whisper model (base.en)',
      );

      // Download whisper binary (platform-specific)
      if (WHISPER_BINARIES[platform]) {
        const whisperBinPath = join(
          VOICE_CACHE_DIR,
          `whisper-bin-${platform}.zip`,
        );
        await downloadFile(
          WHISPER_BINARIES[platform],
          whisperBinPath,
          `Whisper binary (${platform})`,
        );
        const whisperOut = join(
          VOICE_CACHE_DIR,
          platform === 'win32' ? 'whisper.exe' : 'whisper',
        );
        const whisperExtract = join(VOICE_CACHE_DIR, '.extract-whisper');
        whisperBinaryPath = whisperOut;
        await installExecutable({
          archivePath: whisperBinPath,
          extractDir: whisperExtract,
          outputPath: whisperOut,
          candidateNames:
            platform === 'win32'
              ? ['main.exe', 'whisper.exe', 'whisper-cli.exe']
              : ['main', 'whisper', 'whisper-cli'],
        });
        console.log(`✓ Installed whisper binary to ${whisperOut}`);
      } else {
        console.warn(`  No whisper binary available for platform: ${platform}`);
        console.warn('  You will need to build whisper.cpp manually');
      }

      let piperBinaryPath: string | null = null;
      // Download piper binary (platform-specific)
      if (PIPER_BINARIES[platform]) {
        const piperBinExt = platform === 'win32' ? '.zip' : '.tar.gz';
        const piperBinPath = join(
          VOICE_CACHE_DIR,
          `piper-${platform}${piperBinExt}`,
        );
        await downloadFile(
          PIPER_BINARIES[platform],
          piperBinPath,
          `Piper TTS binary (${platform})`,
        );
        const piperOut = join(
          VOICE_CACHE_DIR,
          platform === 'win32' ? 'piper.exe' : 'piper',
        );
        const piperExtract = join(VOICE_CACHE_DIR, '.extract-piper');
        piperBinaryPath = piperOut;
        await installExecutable({
          archivePath: piperBinPath,
          extractDir: piperExtract,
          outputPath: piperOut,
          candidateNames: platform === 'win32' ? ['piper.exe'] : ['piper'],
        });
        console.log(`✓ Installed piper binary to ${piperOut}`);
      } else {
        console.warn(`  No piper binary available for platform: ${platform}`);
      }

      // Download piper voice model
      const piperVoicePath = join(VOICE_CACHE_DIR, 'en_US-lessac-medium.onnx');
      await downloadFile(
        PIPER_VOICE_URL,
        piperVoicePath,
        'Piper voice model (en_US-lessac)',
      );

      const piperVoiceConfigPath = join(
        VOICE_CACHE_DIR,
        'en_US-lessac-medium.onnx.json',
      );
      await downloadFile(
        PIPER_VOICE_CONFIG_URL,
        piperVoiceConfigPath,
        'Piper voice config',
      );

      // Write metadata
      const metadata = {
        installedAt: new Date().toISOString(),
        platform,
        paths: {
          whisperBinary: whisperBinaryPath,
          whisperModel: whisperModelPath,
          piperBinary: piperBinaryPath,
          piperModel: piperVoicePath,
        },
        components: {
          whisper: {
            model: 'ggml-base.en.bin',
            modelUrl: WHISPER_MODEL_URL,
            binaryUrl: WHISPER_BINARIES[platform] || null,
          },
          piper: {
            voice: 'en_US-lessac-medium',
            voiceUrl: PIPER_VOICE_URL,
            binaryUrl: PIPER_BINARIES[platform] || null,
          },
        },
      };

      const metadataPath = join(VOICE_CACHE_DIR, 'metadata.json');
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      console.log('✓ Wrote metadata');

      console.log('');
      console.log('✅ Voice installation complete!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Start the Desktop app');
      console.log('2. Enable Voice in Settings');
      console.log('3. Hold Space to talk');
      console.log('');
    } catch (error) {
      console.error('❌ Installation failed:');
      console.error(error);
      process.exit(1);
    }
  },
};
