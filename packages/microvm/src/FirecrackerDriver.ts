import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FirecrackerConfig {
  kernelPath: string;
  rootfsPath: string;
  socketPath: string;
  logPath: string;
  /** Path to user's workspace to mount into the VM */
  workspacePath?: string;
  /** Socket path for virtiofsd (required if workspacePath is set) */
  virtiofsdSocketPath?: string;
  /** Vsock Context ID for host-guest communication (default: 3) */
  vsockCid?: number;
  /** Path for vsock UDS on host side */
  vsockUdsPath?: string;
  /** Additional kernel arguments (e.g., proxy settings) */
  kernelArgs?: string;
}

export class FirecrackerDriver {
  private process?: ChildProcess;
  private virtiofsdProcess?: ChildProcess;

  constructor(
    private readonly config: FirecrackerConfig,
    private readonly binaryPath: string = path.join(
      __dirname,
      '../resources/firecracker',
    ),
  ) {}

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Firecracker already running');
    }

    // Cleanup stale socket
    if (fs.existsSync(this.config.socketPath)) {
      fs.unlinkSync(this.config.socketPath);
    }

    this.process = spawn(
      this.binaryPath,
      ['--api-sock', this.config.socketPath],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      },
    );

    this.process.stdout?.on('data', (d) =>
      console.log('[FC stdout]', d.toString()),
    );
    this.process.stderr?.on('data', (d) =>
      console.error('[FC stderr]', d.toString()),
    );

    this.process.on('error', (err) => {
      console.error('Firecracker failed to start:', err);
    });

    // Wait for socket to appear
    await this.waitForSocket();

    // Start virtiofsd sidecar if workspace mounting requested
    if (this.config.workspacePath && this.config.virtiofsdSocketPath) {
      await this.startVirtiofsd();
    }

    // Configure VM
    await this.configureBootSource();
    await this.configureRootfs();

    // Configure shared filesystem if workspace path provided
    if (this.config.workspacePath && this.config.virtiofsdSocketPath) {
      await this.configureVirtioFs();
    }

    // Configure vsock for host-guest communication
    if (this.config.vsockCid && this.config.vsockUdsPath) {
      await this.configureVsock();
    }

    // Start Instance
    await this.sendAction('InstanceStart');
  }

  async stop(): Promise<void> {
    if (this.process) {
      // Send shutdown via API or kill
      this.process.kill();
      this.process = undefined;
    }
    if (this.virtiofsdProcess) {
      this.virtiofsdProcess.kill();
      this.virtiofsdProcess = undefined;
    }
    if (fs.existsSync(this.config.socketPath)) {
      fs.unlinkSync(this.config.socketPath);
    }
    if (
      this.config.virtiofsdSocketPath &&
      fs.existsSync(this.config.virtiofsdSocketPath)
    ) {
      fs.unlinkSync(this.config.virtiofsdSocketPath);
    }
  }

  private async waitForSocket(retries = 20, delay = 100): Promise<void> {
    for (let i = 0; i < retries; i++) {
      if (fs.existsSync(this.config.socketPath)) return;
      await new Promise((r) => setTimeout(r, delay));
    }
    throw new Error(
      `Firecracker socket did not appear at ${this.config.socketPath}`,
    );
  }

  private async configureBootSource(): Promise<void> {
    let bootArgs =
      this.config.kernelArgs || 'console=ttyS0 reboot=k panic=1 pci=off';

    await this.request('PUT', '/boot-source', {
      kernel_image_path: this.config.kernelPath,
      boot_args: bootArgs,
    });
  }

  private async configureRootfs(): Promise<void> {
    await this.request('PUT', '/drives/rootfs', {
      drive_id: 'rootfs',
      path_on_host: this.config.rootfsPath,
      is_root_device: true,
      is_read_only: false,
    });
  }

  /**
   * Start virtiofsd sidecar process for shared filesystem.
   * This provides virtio-fs support by running a separate daemon.
   */
  private async startVirtiofsd(): Promise<void> {
    if (!this.config.workspacePath || !this.config.virtiofsdSocketPath) {
      throw new Error(
        'workspacePath and virtiofsdSocketPath required for virtio-fs',
      );
    }

    // Cleanup stale socket
    if (fs.existsSync(this.config.virtiofsdSocketPath)) {
      fs.unlinkSync(this.config.virtiofsdSocketPath);
    }

    // virtiofsd must be installed separately (e.g., apt install virtiofsd)
    this.virtiofsdProcess = spawn(
      'virtiofsd',
      [
        '--socket-path',
        this.config.virtiofsdSocketPath,
        '--shared-dir',
        this.config.workspacePath,
        '--cache=auto',
        '--sandbox=chroot',
      ],
      {
        stdio: ['ignore', 'ignore', 'ignore'],
        detached: false,
      },
    );

    this.virtiofsdProcess.on('error', (err) => {
      console.error('virtiofsd failed to start:', err);
    });

    // Wait for virtiofsd socket
    await this.waitForVirtiofsdSocket();
  }

  private async waitForVirtiofsdSocket(
    retries = 20,
    delay = 100,
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      if (
        this.config.virtiofsdSocketPath &&
        fs.existsSync(this.config.virtiofsdSocketPath)
      )
        return;
      await new Promise((r) => setTimeout(r, delay));
    }
    throw new Error(
      `virtiofsd socket did not appear at ${this.config.virtiofsdSocketPath}`,
    );
  }

  /**
   * Configure shared filesystem via Firecracker API.
   * Maps the virtiofsd socket to a tag 'workspace' accessible inside the VM.
   */
  private async configureVirtioFs(): Promise<void> {
    // Note: Firecracker requires the 'virtiofs' feature and proper kernel support
    await this.request('PUT', '/fs/workspace', {
      fs_id: 'workspace',
      shared_dir: this.config.workspacePath,
      // The socket path to virtiofsd
      socket_path: this.config.virtiofsdSocketPath,
    });
  }

  /**
   * Configure vsock for host-guest communication.
   * This enables the clipboard bridge and RPC between host and guest.
   *
   * The guest can connect to vsock CID 2 (host) to reach the UDS path.
   * The host can connect to the guest at the configured CID.
   */
  private async configureVsock(): Promise<void> {
    if (!this.config.vsockCid || !this.config.vsockUdsPath) {
      throw new Error('vsockCid and vsockUdsPath required for vsock');
    }

    // Cleanup stale socket
    if (fs.existsSync(this.config.vsockUdsPath)) {
      fs.unlinkSync(this.config.vsockUdsPath);
    }

    await this.request('PUT', '/vsock', {
      guest_cid: this.config.vsockCid,
      uds_path: this.config.vsockUdsPath,
    });
  }

  private async sendAction(actionType: string): Promise<void> {
    await this.request('PUT', '/actions', {
      action_type: actionType,
    });
  }

  private request(method: string, path: string, body: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        socketPath: this.config.socketPath,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(body)),
        },
      };

      const req = http.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            reject(
              new Error(
                `Firecracker API ${path} failed: ${res.statusCode} - ${body}`,
              ),
            );
          });
        }
      });

      req.on('error', reject);
      const jsonBody = JSON.stringify(body);
      console.log(`[FirecrackerDriver] ${method} ${path} Payload:`, jsonBody);
      req.write(jsonBody);
      req.end();
    });
  }
}
