/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TypeScript bindings for terminai_native C++ module.
 *
 * This module provides a type-safe interface to the Windows-specific
 * native functionality. On non-Windows platforms, the functions either
 * return appropriate defaults or throw errors.
 */

import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Type Definitions
// ============================================================================

export interface AmsiScanResult {
  /** Whether the content is clean (no threats detected) */
  clean: boolean;
  /** AMSI result code (0 = clean, 1 = not detected, 32768+ = malware) */
  result: number;
  /** Human-readable description of the result */
  description: string;
}

export interface NativeModule {
  /** Create a process running in AppContainer sandbox */
  createAppContainerSandbox: (
    commandLine: string,
    workspacePath: string,
    enableInternet?: boolean,
  ) => number;

  /** Create a process running in AppContainer sandbox with env block */
  createAppContainerSandboxWithEnv: (
    commandLine: string,
    workspacePath: string,
    enableInternet: boolean,
    env: Record<string, string>,
  ) => number;

  /** Ensure AppContainer profile exists and return SID */
  ensureAppContainerProfile: () => string;

  /** Get the SID of the TerminAI AppContainer profile */
  getAppContainerSid: () => string;

  /** Delete the TerminAI AppContainer profile */
  deleteAppContainerProfile: () => boolean;

  /** Scan content for malware using Windows AMSI */
  amsiScanBuffer: (content: string, filename: string) => AmsiScanResult;

  /** Scan a file for malware by reading its contents */
  amsiScanFile: (filepath: string) => AmsiScanResult;

  /** Whether running on Windows */
  isWindows: boolean;

  /** Whether AMSI is initialized and available */
  isAmsiAvailable: boolean;

  /** Native module version */
  version: string;

  SecurePipeServer: new (pipePath: string, appContainerSid: string) => {
    listen(): void;
    acceptConnection(): Promise<void>;
    read(): Promise<string>;
    write(data: string): Promise<void>;
    close(): void;
    isConnected(): boolean;
    getPipePath(): string;
  };

  verifyPipeDacl: (
    pipePath: string,
    appContainerSid: string,
  ) => { ok: boolean; details?: string; missing?: string[] };
}

// ============================================================================
// Native Module Loading
// ============================================================================

let nativeModule: NativeModule | null = null;
let loadError: Error | null = null;
let nativeModulePath: string | null = null;
let nativeModuleSource: 'prebuild' | 'local' | 'unavailable' = 'unavailable';
const requireFn = createRequire(import.meta.url);

function loadNativeModule(): NativeModule | null {
  if (nativeModule) return nativeModule;
  if (loadError) return null;

  // Skip load attempt on non-Windows platforms
  if (process.platform !== 'win32') {
    return null;
  }

  try {
    const arch = process.arch;
    const prebuildPackage =
      arch === 'x64'
        ? '@terminai/native-win32-x64'
        : arch === 'arm64'
          ? '@terminai/native-win32-arm64'
          : null;

    if (prebuildPackage) {
      try {
        const prebuildPath = requireFn.resolve(
          `${prebuildPackage}/terminai_native.node`,
        );
        nativeModule = requireFn(prebuildPath) as NativeModule;
        nativeModulePath = prebuildPath;
        nativeModuleSource = 'prebuild';
        console.log('[native] Loaded native module from:', prebuildPath);
        return nativeModule;
      } catch {
        // ignore
      }
    }

    const possiblePaths = [
      // When running from packages/cli/src/runtime/windows/
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'build',
        'Release',
        'terminai_native.node',
      ),
      // When running from packages/cli/dist/
      path.join(
        __dirname,
        '..',
        '..',
        'build',
        'Release',
        'terminai_native.node',
      ),
      // Relative to package root
      path.join(process.cwd(), 'build', 'Release', 'terminai_native.node'),
    ];

    for (const modulePath of possiblePaths) {
      if (fs.existsSync(modulePath)) {
        nativeModule = requireFn(modulePath) as NativeModule;
        nativeModulePath = modulePath;
        nativeModuleSource = 'local';
        console.log('[native] Loaded native module from:', modulePath);
        return nativeModule;
      }
    }

    throw new Error(
      'Native module not found. Run "npm run build:native" to build it.',
    );
  } catch (error) {
    loadError = error as Error;
    console.warn('[native] Failed to load native module:', loadError.message);
    return null;
  }
}

export interface NativeModuleStatus {
  available: boolean;
  source: 'prebuild' | 'local' | 'unavailable';
  version: string;
  path: string;
  error?: string;
}

export function getNativeModuleStatus(): NativeModuleStatus {
  const native = loadNativeModule();
  return {
    available: Boolean(native),
    source: native ? nativeModuleSource : 'unavailable',
    version: native?.version ?? '',
    path: nativeModulePath ?? '',
    error: loadError?.message,
  };
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Check if running on Windows.
 */
export const isWindows = process.platform === 'win32';

/**
 * Check if AMSI is available.
 */
export function getIsAmsiAvailable(): boolean {
  const native = loadNativeModule();
  return native?.isAmsiAvailable ?? false;
}

/**
 * Re-export isAmsiAvailable as a getter-like constant
 */
export const isAmsiAvailable =
  process.platform === 'win32' ? getIsAmsiAvailable() : false;

/**
 * Create a process running in AppContainer sandbox.
 *
 * @param commandLine Command line to execute (e.g., "node agent.js")
 * @param workspacePath Path to workspace directory
 * @param enableInternet Enable internet access for the sandbox (default: true)
 * @returns Process ID on success, negative error code on failure
 *
 * Error codes:
 * -1: Profile creation failed
 * -2: ACL failure (workspace locked)
 * -3: Process creation failed
 * -4: Invalid arguments
 * -5: Capability error
 */
export function createAppContainerSandbox(
  commandLine: string,
  workspacePath: string,
  enableInternet = true,
): number {
  const native = loadNativeModule();
  if (!native) {
    throw new Error('Native module not available');
  }
  return native.createAppContainerSandbox(
    commandLine,
    workspacePath,
    enableInternet,
  );
}

export function createAppContainerSandboxWithEnv(
  commandLine: string,
  workspacePath: string,
  enableInternet: boolean,
  env: Record<string, string>,
): number {
  const native = loadNativeModule();
  if (!native) {
    throw new Error('Native module not available');
  }
  return native.createAppContainerSandboxWithEnv(
    commandLine,
    workspacePath,
    enableInternet,
    env,
  );
}

export function ensureAppContainerProfile(): string {
  const native = loadNativeModule();
  if (!native) {
    return '';
  }
  return native.ensureAppContainerProfile();
}

/**
 * Get the SID of the TerminAI AppContainer profile.
 *
 * @returns SID string or empty string if profile doesn't exist
 */
export function getAppContainerSid(): string {
  const native = loadNativeModule();
  if (!native) {
    return '';
  }
  return native.getAppContainerSid();
}

/**
 * Delete the TerminAI AppContainer profile.
 *
 * @returns true if successful or profile didn't exist
 */
export function deleteAppContainerProfile(): boolean {
  const native = loadNativeModule();
  if (!native) {
    return true;
  }
  return native.deleteAppContainerProfile();
}

export function getNativeVersion(): string {
  const native = loadNativeModule();
  if (!native) {
    return '';
  }
  return native.version;
}

export function createSecurePipeServer(
  pipePath: string,
  appContainerSid: string,
): InstanceType<NativeModule['SecurePipeServer']> {
  const native = loadNativeModule();
  if (!native) {
    throw new Error('Native module not available');
  }
  return new native.SecurePipeServer(pipePath, appContainerSid);
}

export function verifyPipeDacl(
  pipePath: string,
  appContainerSid: string,
): { ok: boolean; details?: string; missing?: string[] } {
  const native = loadNativeModule();
  if (!native) {
    throw new Error('Native module not available');
  }
  return native.verifyPipeDacl(pipePath, appContainerSid);
}

/**
 * Scan content for malware using Windows AMSI.
 *
 * @param content Content to scan (script body)
 * @param filename Filename context for the scan
 * @returns Scan result with clean status and description
 */
export function amsiScanBuffer(
  content: string,
  filename: string,
): AmsiScanResult {
  const native = loadNativeModule();
  if (!native) {
    // On non-Windows, return "clean" as there's no AMSI to check
    return {
      clean: true,
      result: 0,
      description: 'AMSI not available (non-Windows platform)',
    };
  }
  return native.amsiScanBuffer(content, filename);
}

/**
 * Scan a file for malware by reading its contents.
 *
 * @param filepath Absolute path to the file
 * @returns Scan result with clean status and description
 */
export function amsiScanFile(filepath: string): AmsiScanResult {
  const native = loadNativeModule();
  if (!native) {
    return {
      clean: true,
      result: 0,
      description: 'AMSI not available (non-Windows platform)',
    };
  }
  return native.amsiScanFile(filepath);
}
