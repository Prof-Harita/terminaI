import { spawn, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MacVZConfig {
  kernelPath: string;
  initrdPath?: string;
  cmdline: string;
  memorySizeMB: number;
  cpuCount: number;
  vsockPath?: string;
  sharedDirs?: {
    hostPath: string;
    tag: string;
    readonly: boolean;
  }[];
}

export class MacVZDriver {
  private process?: ChildProcess;
  private readonly helperPath: string;

  constructor(private readonly config: MacVZConfig) {
    this.helperPath = path.resolve(__dirname, '../resources/vz-helper');
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('VM already running');
    }

    if (!fs.existsSync(this.helperPath)) {
      throw new Error(
        `VZ helper binary not found at ${this.helperPath}. Run scripts/build-vz-helper.sh`,
      );
    }

    return new Promise((resolve, reject) => {
      this.process = spawn(this.helperPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'], // pipe stdin for config, stdout for status
      });

      // Send config via stdin
      const configJson = JSON.stringify(this.config);
      this.process.stdin?.write(configJson);
      this.process.stdin?.end();

      // Listen for status
      this.process.stdout?.on('data', (data) => {
        const str = data.toString().trim();
        try {
          const status = JSON.parse(str);
          if (status.status === 'running') {
            resolve();
          } else if (status.status === 'error') {
            this.stop().finally(() => reject(new Error(status.message)));
          }
        } catch {
          // Ignore non-JSON logs (maybe from boot)
          console.log('[VZ]', str);
        }
      });

      this.process.stderr?.on('data', (data) => {
        console.error('[VZ Error]', data.toString());
      });

      this.process.on('close', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`VZ helper exited with code ${code}`));
        }
        this.process = undefined;
      });
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = undefined;
    }
  }
}
