/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NetworkDetector: Utilities for detecting network connectivity in Micro-VM.
 *
 * Since Firecracker VMs may have various network configurations (NAT, bridge, none),
 * this module provides methods to detect and report connectivity status.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import * as dns from 'node:dns';

export interface NetworkStatus {
  hasInternetAccess: boolean;
  hasDnsResolution: boolean;
  canReachLlmEndpoint: boolean;
  diagnostics?: string;
}

export class NetworkDetector {
  private readonly dnsTestHostnames = ['google.com', 'api.openai.com'];

  /**
   * Run full network diagnostics.
   * Call this from guest init to determine if network-dependent features are available.
   */
  async diagnose(): Promise<NetworkStatus> {
    const [dnsOk, internetOk, llmOk] = await Promise.all([
      this.checkDns(),
      this.checkInternet(),
      this.checkLlmEndpoint(),
    ]);

    return {
      hasDnsResolution: dnsOk,
      hasInternetAccess: internetOk,
      canReachLlmEndpoint: llmOk,
      diagnostics: this.buildDiagnostics(dnsOk, internetOk, llmOk),
    };
  }

  private async checkDns(): Promise<boolean> {
    for (const hostname of this.dnsTestHostnames) {
      try {
        await new Promise<void>((resolve, reject) => {
          dns.resolve(hostname, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        return true;
      } catch {
        // Try next hostname
      }
    }
    return false;
  }

  private async checkInternet(): Promise<boolean> {
    return this.httpHead('https://google.com', 5000);
  }

  private async checkLlmEndpoint(): Promise<boolean> {
    return this.httpHead('https://api.openai.com', 5000);
  }

  private httpHead(url: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(
        url,
        { method: 'HEAD', timeout: timeoutMs },
        (res: http.IncomingMessage) => {
          resolve(res.statusCode !== undefined && res.statusCode < 500);
        },
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  private buildDiagnostics(
    dns: boolean,
    internet: boolean,
    llm: boolean,
  ): string {
    const issues: string[] = [];
    if (!dns) issues.push('DNS resolution failed');
    if (!internet) issues.push('No internet connectivity');
    if (!llm) issues.push('Cannot reach LLM API endpoints');
    return issues.length > 0 ? issues.join('; ') : 'All network checks passed';
  }
}
