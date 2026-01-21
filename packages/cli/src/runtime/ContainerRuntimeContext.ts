/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  RuntimeContext,
  ExecutionOptions,
  ExecutionResult,
} from '@terminai/core';
import { execSync } from 'node:child_process';
import { RuntimeProcess } from '@terminai/core';
import { RuntimeProcess } from '@terminai/core';

/**
 * ContainerRuntimeContext - Docker/Podman Container Runtime (Phase 3)
 *
 * @deprecated Container support is deferred to Phase 3.
 *
 * Rationale:
 * - Micro-VM provides better isolation with faster boot times
 * - Windows users require AppContainer (not Linux containers) for System Operator tasks
 * - "Widest audience, least pain" principle prioritizes Micro-VM auto-installation
 *
 * This class exists as a stub for future implementation.
 * It is NOT currently wired into RuntimeManager.
 *
 * @see architecture-sovereign-runtime.md Section 6 (Micro-VM Priority)
 * @see packages/microvm/src/MicroVMRuntimeContext.ts (Preferred isolation)
 * @see packages/cli/src/runtime/windows/WindowsBrokerContext.ts (Windows isolation)
 */
export class ContainerRuntimeContext implements RuntimeContext {
  readonly type = 'container';
  readonly isIsolated = true;
  readonly displayName = 'Docker Container';

  // In the container, Python is at a fixed path (guaranteed by the image)
  readonly pythonPath = '/usr/bin/python3';
  readonly taptsVersion: string;

  constructor(cliVersion: string) {
    // Ideally we'd validte the container image version here
    // For now, we assume implicit compatibility
    this.taptsVersion = cliVersion;
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      // Check if container is running or accessible
      // Since this class represents the *context*, and the actual running
      // might happen via PersistentShell wrapping a docker command,
      // we need to clarify if this Context implies "running inside" or "managing from outside".

      // Architecture implication:
      // This context manages the runtime.
      // If we are using standard docker/podman, we might just check if the daemon is up.

      execSync('docker info', { stdio: 'ignore' });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Docker daemon not reachable' };
    }
  }

  async dispose(): Promise<void> {
    // Cleanup any containers if we started them (roadmap item)
    // Currently we rely on PersistentShell to manage the process,
    // so there's not much state here yet.
  }

  async execute(
    command: string,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    throw new Error(
      'Container runtime execution not implemented (Deferred to Phase 3)',
    );
  }

  async spawn(
    command: string,
    options?: ExecutionOptions,
  ): Promise<RuntimeProcess> {
    throw new Error('Container Runtime spawn not implemented (Phase 3)');
  }
}
