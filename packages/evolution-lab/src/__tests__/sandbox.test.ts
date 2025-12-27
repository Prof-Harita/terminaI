/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { SandboxController } from '../sandbox.js';

describe('SandboxController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to docker-backed sandboxes', async () => {
    const controller = new SandboxController();
    const startSpy = vi
      .spyOn(
        controller as unknown as {
          startDockerContainer: (id: string, workDir: string) => Promise<string>;
        },
        'startDockerContainer',
      )
      .mockResolvedValue('container-id');

    const sandbox = await controller.create();
    expect(sandbox.type).toBe('docker');
    expect(startSpy).toHaveBeenCalledOnce();
    await controller.destroy(sandbox);
  });

  it('requires opt-in for host execution', async () => {
    const controller = new SandboxController({ type: 'host' });
    await expect(controller.create()).rejects.toThrow(/allow-unsafe-host/);
  });

  it('allows host execution when opt-in is set', async () => {
    const controller = new SandboxController({
      type: 'host',
      allowUnsafeHost: true,
    });
    const sandbox = await controller.create();
    expect(sandbox.type).toBe('host');
    expect(sandbox.containerId).toBeUndefined();
    await controller.destroy(sandbox);
  });
});
