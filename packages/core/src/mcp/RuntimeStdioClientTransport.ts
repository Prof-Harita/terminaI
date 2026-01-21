import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { RuntimeContext, RuntimeProcess } from '../computer/RuntimeContext.js';

/**
 * A custom MCP Transport that uses RuntimeContext to spawn the server process.
 * This ensures that MCP servers run within the defined runtime boundary (e.g. MicroVM),
 * preventing sovereignty leaks.
 */
export class RuntimeStdioClientTransport implements Transport {
  private _process?: RuntimeProcess;
  private _transport?: StdioClientTransport;
  private _runtime: RuntimeContext;
  private _command: string;
  private _args: string[];
  private _env?: Record<string, string>;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    runtime: RuntimeContext,
    command: string,
    args: string[],
    env?: Record<string, string>,
  ) {
    this._runtime = runtime;
    this._command = command;
    this._args = args;
    this._env = env;
  }

  async start(): Promise<void> {
    if (this._process) {
      throw new Error('Transport already started');
    }

    // Use runtime to spawn the process
    this._process = await this._runtime.spawn(this._command, {
      args: this._args,
      env: this._env,
    });

    // Create a vanilla StdioClientTransport but inject the process streams
    // Since StdioClientTransport constructor expects a ChildProcess-like object or manual streams,
    // we can use the manual start mechanism or polyfill if SDK allows.
    // Looking at SDK: StdioClientTransport spawns internally in its start() method.
    // We cannot easily inject the process into it.
    // So we must RE-IMPLEMENT StdioClientTransport logic here using our RuntimeProcess.

    // Re-implementation of basic StdioClientTransport logic:
    // We need to parse JSON-RPC messages from stdout and write to stdin.
    // Ideally we'd reuse the ReadWrite transport logic from SDK if available.
    // For now, let's wrap the streams.

    // Actually, StdioClientTransport is complex.
    // Let's see if we can instantiate it with our streams? No, it takes command/args.

    // Alternative: We create a dummy transport that delegates to our process streams.
    // But we need JSON-RPC framing.

    // We'll rely on the SDK's internal buffering if we can access it.
    // But since we can't, we'll implement a simple Line-Delimited JSON-RPC reader/writer.

    // Attach listeners
    this._process.stdout?.on('data', (chunk: Buffer) =>
      this._handleData(chunk),
    );
    this._process.stderr?.on('data', (chunk: Buffer) => {
      // Log stderr?
      console.error(
        `[MCP-Runtime] ${this._command} stderr: ${chunk.toString()}`,
      );
    });

    this._process.on('close', () => {
      this.onclose?.();
    });

    this._process.on('error', (err: Error) => {
      this.onerror?.(err);
    });
  }

  private _buffer: string = '';

  private _handleData(chunk: Buffer) {
    this._buffer += chunk.toString();
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop() || ''; // Keep incomplete line

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.onmessage?.(message);
        } catch (e) {
          console.error('[MCP-Runtime] Failed to parse JSON:', e);
        }
      }
    }
  }

  async close(): Promise<void> {
    this._process?.kill();
    this._process = undefined;
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._process || !this._process.stdin) {
      throw new Error('Transport not started');
    }
    const json = JSON.stringify(message) + '\n';
    this._process.stdin.write(json);
  }
}
