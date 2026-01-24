/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, type SlashCommand } from './types.js';
import { MessageType } from '../types.js';
import { CommandCategory } from './categories.js';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';

interface CheckResult {
  name: string;
  ok: boolean;
  details?: string;
}

function formatResults(results: CheckResult[]): string {
  return results
    .map((r) => {
      const status = r.ok ? '✅' : '❌';
      return `${status} ${r.name}${r.details ? ` — ${r.details}` : ''}`;
    })
    .join('\n');
}

async function runWindowsAppContainerChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  if (process.platform !== 'win32') {
    results.push({
      name: 'Platform',
      ok: false,
      details: 'Windows required',
    });
    return results;
  }

  const native = await import('../../runtime/windows/native.js');
  results.push({
    name: 'Native module load',
    ok: native.isWindows,
    details: native.getNativeVersion() || 'unknown version',
  });

  const sid = native.ensureAppContainerProfile();
  results.push({
    name: 'AppContainer profile',
    ok: Boolean(sid),
    details: sid || 'missing SID',
  });

  if (!sid) {
    return results;
  }

  try {
    const workspacePath = process.cwd();
    const aclOutput = execSync(`icacls "${workspacePath}"`, {
      encoding: 'utf-8',
    });
    const aclOk = aclOutput.toLowerCase().includes(sid.toLowerCase());
    results.push({
      name: 'Workspace ACL',
      ok: aclOk,
      details: aclOk ? 'AppContainer SID present' : 'SID not found in ACL',
    });
  } catch (error) {
    results.push({
      name: 'Workspace ACL',
      ok: false,
      details: (error as Error).message,
    });
  }

  const { BrokerServer } = await import('../../runtime/windows/BrokerServer.js');
  const { BrokerClient } = await import('../../runtime/windows/BrokerClient.js');
  const { createAppContainerSandboxWithEnv, verifyPipeDacl } = await import(
    '../../runtime/windows/native.js'
  );

  const handshakeToken = `doctor-${randomUUID()}`;
  const server = new BrokerServer({
    workspacePath: process.cwd(),
    checkNodePermissions: false,
    handshakeToken,
    appContainerSid: sid,
  });

  try {
    server.on('request', async (req, respond) => {
      if (req.type === 'ping') {
        respond({ id: req.id, success: true, data: { pong: true } });
        return;
      }
      if (req.type === 'execute') {
        const { spawn } = await import('node:child_process');
        const args = req.args ?? [];
        const proc =
          req.mode === 'shell'
            ? spawn('cmd', ['/c', req.command], { shell: false })
            : spawn(req.command, args, { shell: false });
        let stdout = '';
        let stderr = '';
        proc.stdout?.on('data', (d) => (stdout += d.toString()));
        proc.stderr?.on('data', (d) => (stderr += d.toString()));
        proc.on('close', (code) => {
          respond({
            id: req.id,
            success: true,
            data: { exitCode: code ?? -1, stdout, stderr },
          });
        });
        return;
      }
      respond({
        id: req.id,
        success: false,
        error: 'Unsupported request',
      });
    });

    await server.start();
    results.push({
      name: 'Secure pipe',
      ok: server.isSecure,
      details: server.isSecure ? 'DACL restricted' : 'Open pipe fallback',
    });
    if (server.isSecure) {
      try {
        const daclCheck = verifyPipeDacl(server.path, sid);
        results.push({
          name: 'Pipe ACL',
          ok: daclCheck.ok,
          details: daclCheck.details,
        });
      } catch (error) {
        results.push({
          name: 'Pipe ACL',
          ok: false,
          details: (error as Error).message,
        });
      }
    }

    let brainPid: number | null = null;
    const brainScript = path.join(
      process.cwd(),
      'packages',
      'cli',
      'dist',
      'agent-brain.js',
    );
    if (fs.existsSync(brainScript)) {
      const commandLine = `node "${brainScript}" --pipe="${server.path}"`;
      brainPid = createAppContainerSandboxWithEnv(
        commandLine,
        process.cwd(),
        true,
        {
          TERMINAI_BROKER_PIPE: server.path,
          TERMINAI_HANDSHAKE_TOKEN: handshakeToken,
          TERMINAI_CLI_VERSION: 'doctor',
        },
      );
    }

    const handshakeTimeoutMs = 5000;
    const start = Date.now();
    while (!server.hasHandshake && Date.now() - start < handshakeTimeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    results.push({
      name: 'Brain↔Hands (real AppContainer)',
      ok: server.hasHandshake,
      details: server.hasHandshake ? 'handshake ok' : 'no handshake',
    });

    const client = new BrokerClient({
      pipePath: server.path,
      handshakeToken,
      autoReconnect: false,
    });

    await client.connect();
    const ping = await client.ping();
    results.push({
      name: 'Brain↔Hands handshake',
      ok: ping.pong === true,
      details: ping.pong ? 'pong' : 'no response',
    });
    const execResult = await client.execute('cmd', ['/c', 'echo doctor'], {
      mode: 'exec',
    });
    results.push({
      name: 'Structured execute',
      ok: execResult.exitCode === 0,
      details: execResult.stdout.trim() || execResult.stderr,
    });
    await client.disconnect();

    if (brainPid && brainPid > 0) {
      try {
        process.kill(brainPid, 'SIGTERM');
      } catch {
        // ignore
      }
    }
  } catch (error) {
    results.push({
      name: 'Broker IPC',
      ok: false,
      details: (error as Error).message,
    });
  } finally {
    await server.stop();
  }

  const amsiAvailable = native.isAmsiAvailable;
  results.push({
    name: 'AMSI available',
    ok: amsiAvailable,
    details: amsiAvailable ? 'available' : 'unavailable',
  });

  if (amsiAvailable) {
    const scan = native.amsiScanBuffer('Write-Output "ok"', 'test.ps1');
    results.push({
      name: 'AMSI scan',
      ok: scan.clean,
      details: scan.description,
    });

    const eicarSample =
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const eicarScan = native.amsiScanBuffer(eicarSample, 'eicar.txt');
    results.push({
      name: 'AMSI block test',
      ok: !eicarScan.clean,
      details: eicarScan.clean
        ? 'EICAR sample not blocked'
        : eicarScan.description,
    });
  }

  return results;
}

export const doctorCommand: SlashCommand = {
  name: 'doctor',
  description: 'Run diagnostic checks. Usage: /doctor windows-appcontainer',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  category: CommandCategory.SYSTEM_OPERATOR,
  subCommands: [
    {
      name: 'windows-appcontainer',
      description: 'Validate Windows AppContainer readiness',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: async (context) => {
        const results = await runWindowsAppContainerChecks();
        const ok = results.every((r) => r.ok);
        context.ui.addItem(
          {
            type: ok ? MessageType.INFO : MessageType.ERROR,
            text: formatResults(results),
          },
          Date.now(),
        );
      },
    },
  ],
};
