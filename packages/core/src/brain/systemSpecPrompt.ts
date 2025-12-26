/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SystemSpec } from './systemSpec.js';

/**
 * Formats the SystemSpec for injection into the LLM system prompt.
 * @param spec The system specification to format
 * @returns A markdown-formatted string describing system capabilities
 */
export function formatSystemSpecForPrompt(spec: SystemSpec): string {
  const osStr = `${spec.os.name} ${spec.os.version} (${spec.os.arch})`;
  const shellStr = `${spec.shell.type} ${spec.shell.version}`;

  const runtimes: string[] = [];
  if (spec.runtimes.node) runtimes.push(`Node ${spec.runtimes.node.version}`);
  if (spec.runtimes.python)
    runtimes.push(`Python ${spec.runtimes.python.version}`);
  if (spec.runtimes.ruby) runtimes.push(`Ruby ${spec.runtimes.ruby.version}`);
  if (spec.runtimes.go) runtimes.push(`Go ${spec.runtimes.go.version}`);
  if (spec.runtimes.rust) runtimes.push(`Rust ${spec.runtimes.rust.version}`);
  const runtimeStr =
    runtimes.length > 0 ? runtimes.join(', ') : 'None detected';

  const availableBinaries = Object.keys(spec.binaries).filter(
    (name) => spec.binaries[name],
  );
  const missingBinaries = [
    'git',
    'curl',
    'wget',
    'docker',
    'google-chrome',
    'libreoffice',
    'pandoc',
  ].filter((name) => !spec.binaries[name]);

  const capabilities: string[] = [
    `## System Capabilities`,
    `- OS: ${osStr}`,
    `- Shell: ${shellStr}`,
    `- Runtimes: ${runtimeStr}`,
    `- Available: ${availableBinaries.join(', ') || 'None'}`,
  ];

  if (missingBinaries.length > 0) {
    capabilities.push(`- Missing: ${missingBinaries.join(', ')}`);
  }

  capabilities.push(
    `- Sudo: ${spec.sudoAvailable ? 'available' : 'restricted'}`,
  );
  capabilities.push(
    `- Internet: ${spec.network.hasInternet ? 'connected' : 'none'}`,
  );

  return capabilities.join('\n');
}
