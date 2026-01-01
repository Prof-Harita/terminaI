/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';

/**
 * Mapping of Python module names to apt package names.
 * Extend this as needed for new Python dependencies.
 */
const PYTHON_MODULE_TO_APT_PACKAGE: Record<string, string[]> = {
  // AT-SPI / accessibility
  pyatspi: ['python3-pyatspi', 'gir1.2-atspi-2.0'],
  gi: ['python3-gi'],
  dbus: ['python3-dbus'],

  // Common Python packages
  numpy: ['python3-numpy'],
  PIL: ['python3-pil'],
  cv2: ['python3-opencv'],
  requests: ['python3-requests'],
  yaml: ['python3-yaml'],
  bs4: ['python3-bs4'],
  lxml: ['python3-lxml'],
  cryptography: ['python3-cryptography'],
  paramiko: ['python3-paramiko'],
  psutil: ['python3-psutil'],
  serial: ['python3-serial'],
};

/**
 * Check if running on a Debian-based system
 */
function isDebianBased(): boolean {
  try {
    execSync('which apt-get', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse Python error output for missing module names
 */
export function parseMissingModules(stderr: string): string[] {
  const modules: string[] = [];

  // Match patterns like:
  // "ModuleNotFoundError: No module named 'pyatspi'"
  // "ImportError: No module named gi.repository"
  const patterns = [
    /ModuleNotFoundError: No module named ['\"]?([a-zA-Z0-9_]+)/g,
    /ImportError: No module named ['\"]?([a-zA-Z0-9_]+)/g,
    /ImportError: cannot import name .* from ['\"]?([a-zA-Z0-9_]+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(stderr)) !== null) {
      const moduleName = match[1];
      if (moduleName && !modules.includes(moduleName)) {
        modules.push(moduleName);
      }
    }
  }

  return modules;
}

/**
 * Get apt packages needed for the given Python modules
 */
export function getAptPackagesForModules(modules: string[]): string[] {
  const packages: string[] = [];

  for (const module of modules) {
    const aptPackages = PYTHON_MODULE_TO_APT_PACKAGE[module];
    if (aptPackages) {
      for (const pkg of aptPackages) {
        if (!packages.includes(pkg)) {
          packages.push(pkg);
        }
      }
    } else {
      // Fallback: try python3-{modulename}
      const fallback = `python3-${module.toLowerCase()}`;
      if (!packages.includes(fallback)) {
        packages.push(fallback);
      }
    }
  }

  return packages;
}

/**
 * Attempt to install missing Python dependencies via apt-get.
 * Returns true if installation succeeded (or no install needed).
 */
export async function installPythonDependencies(
  stderr: string,
): Promise<boolean> {
  // Only works on Debian-based systems
  if (!isDebianBased()) {
    console.warn(
      'Auto-install only supported on Debian-based systems (apt-get)',
    );
    return false;
  }

  const missingModules = parseMissingModules(stderr);
  if (missingModules.length === 0) {
    return false; // Nothing to install
  }

  const packages = getAptPackagesForModules(missingModules);
  if (packages.length === 0) {
    console.warn(`Unknown Python modules: ${missingModules.join(', ')}`);
    return false;
  }

  const packagesStr = packages.join(' ');
  console.log(`Installing missing Python dependencies: ${packagesStr}`);

  try {
    execSync(`sudo apt-get install -y ${packagesStr}`, {
      stdio: 'inherit',
      timeout: 120000, // 2 minute timeout
    });
    console.log('Python dependencies installed successfully.');
    return true;
  } catch (e) {
    console.error('Failed to install Python dependencies:', e);
    return false;
  }
}

/**
 * Check if an error string indicates missing Python modules
 */
export function isMissingPythonModuleError(error: string): boolean {
  return (
    error.includes('ModuleNotFoundError') ||
    error.includes('No module named') ||
    error.includes('ImportError')
  );
}
