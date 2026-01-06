/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

declare module 'node-pty' {
  export interface IPty {
    pid: number;
    cols: number;
    rows: number;
    process: string;
    handleFlowControl: boolean;
    onData(listener: (data: string) => void): { dispose: () => void };
    onExit(listener: (e: { exitCode: number; signal?: number }) => void): {
      dispose: () => void;
    };
    resize(columns: number, rows: number): void;
    write(data: string): void;
    kill(signal?: string): void;
  }
  export function spawn(
    file: string,
    args: string[] | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any,
  ): IPty;
}
declare module 'shell-quote';
declare module 'uuid';
declare module 'fs-extra';
declare module 'tar';
