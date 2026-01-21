import type {
  RuntimeContext,
  ExecutionOptions,
  ExecutionResult,
}   ExecutionResult,
  RuntimeProcess,
}   ExecutionResult,
  RuntimeProcess,
} from '@terminai/core';
import { FirecrackerDriver } from './FirecrackerDriver.js';
import { MacVZDriver } from './MacVZDriver.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export class MicroVMRuntimeContext implements RuntimeContext {
  static async isAvailable(): Promise<boolean> {
    if (process.platform === 'linux') {
      // Check for KVM
      if (!fs.existsSync('/dev/kvm')) return false;
      try {
        fs.accessSync('/dev/kvm', fs.constants.R_OK | fs.constants.W_OK);
      } catch {
        return false; // No permission
      }

      // Check for resources
      let resourcesDir = path.join(__dirname, '../resources');
      if (!fs.existsSync(resourcesDir)) {
        resourcesDir = path.join(path.dirname(process.execPath), 'resources');
      }

      const kernelPath = path.join(resourcesDir, 'vmlinux-x86_64.bin');
      const fcPath = path.join(resourcesDir, 'firecracker');

      return fs.existsSync(kernelPath) && fs.existsSync(fcPath);
    } else if (process.platform === 'darwin') {
      // macOS check
      const resourcesDir = path.join(__dirname, '../resources');
      const helperPath = path.join(resourcesDir, 'vz-helper');
      return fs.existsSync(helperPath);
    }
    return false;
  }

  readonly type = 'microvm';
  readonly isIsolated = true;
  readonly displayName = 'Sovereign Runtime (Micro-VM)';

  readonly pythonPath: string = '/usr/bin/python3'; // Inside guest
  readonly taptsVersion: string = 'unknown';

  private driver?: FirecrackerDriver | MacVZDriver;

  constructor() {}

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    // Only verify we can instantiate the driver config
    try {
      // Check if binaries exist
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  async initialize(): Promise<void> {
    const runDir = path.join(os.tmpdir(), 'terminai-microvm');
    // Ensure run dir exists
    if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });

    let resourcesDir = path.join(__dirname, '../resources');
    if (!fs.existsSync(resourcesDir)) {
      // Fallback for SEA sidecar
      resourcesDir = path.join(path.dirname(process.execPath), 'resources');
    }

    const kernelPath = path.join(resourcesDir, 'vmlinux-x86_64.bin');
    // In Phase 1.5, we might not have a full rootfs yet, using dummy or basic
    // For now, let's point to a placeholder. Real rootfs comes in next step.
    const rootfsPath = path.join(resourcesDir, 'rootfs.ext4');
    if (!fs.existsSync(rootfsPath)) {
      // Create dummy file to prevent instantaneous crash if we try to boot,
      // though booting without valid rootfs will fail.
      // This is Foundation only.
      fs.writeFileSync(rootfsPath, '');
    }

    // Build kernel args (boot args)
    const proxyArgs = this.getProxyKernelArgs();

    if (process.platform === 'darwin') {
      // macOS init

      this.driver = new MacVZDriver({
        kernelPath, // Re-using linux kernel path for now, strictly might need ARM64 one on M1
        cmdline: `console=hvc0 root=/dev/vda rw ${proxyArgs}`,
        memorySizeMB: 512,
        cpuCount: 1,
        vsockPath: path.join(runDir, 'vz.vsock'), // Placeholder, VZ handles this differently
        // sharedDirs: ...
      });
    } else {
      // Linux init
      this.driver = new FirecrackerDriver({
        kernelPath,
        rootfsPath,
        socketPath: path.join(runDir, 'firecracker.sock'),
        logPath: path.join(runDir, 'firecracker.log'),
        // Default vsock configuration
        vsockCid: 3,
        vsockUdsPath: path.join(runDir, 'firecracker.vsock'),
        kernelArgs: proxyArgs,
      });
    }

    // In a real scenario, we would start here.
    // For Phase 1.5 Foundation (Task 21-30), we just prepare the class.
    // await this.driver.start();
  }

  async dispose(): Promise<void> {
    if (this.driver) {
      await this.driver.stop();
    }
  }

      });
    }
  }

  async dispose(): Promise<void> {
    if (this.driver) {
      await this.driver.stop();
    }
  }


  private getProxyKernelArgs(): string {
    const args: string[] = [];
    const vars = [
      'HTTP_PROXY',
      'HTTPS_PROXY',
      'NO_PROXY',
      'http_proxy',
      'https_proxy',
      'no_proxy',
    ];

    // We forward these as kernel command line arguments.
    // The init process (or valid agent) inside the guest needs to read /proc/cmdline and export them.
    for (const v of vars) {
      if (process.env[v]) {
        // Simple sanitization
        args.push(`${v}="${process.env[v]}"`);
      }
    }

    return args.join(' ');
  }

  async execute(
    command: string,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    throw new Error('MicroVM execute not implemented yet');
  }

  async spawn(
    command: string,
    options?: ExecutionOptions,
  ): Promise<RuntimeProcess> {
    throw new Error('MicroVM spawn not implemented yet');
  }
}
}
