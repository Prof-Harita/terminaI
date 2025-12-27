/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Server } from 'node:http';
import {
  createApp,
  updateCoderAgentCardUrl,
  createRemoteAuthState,
  getRemoteAuthPath,
  loadRemoteAuthState,
  saveRemoteAuthState,
} from '@terminai/a2a-server';
import crypto from 'node:crypto';
import net from 'node:net';
import path from 'node:path';

export type WebRemoteServerOptions = {
  host: string;
  port: number;
  allowedOrigins: string[];
  tokenOverride?: string;
  rotateToken?: boolean;
  activeToken?: string | null;
};

export type WebRemoteAuthResult = {
  token: string | null;
  tokenSource: 'override' | 'generated' | 'env' | 'existing';
  authPath: string;
};

export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (normalized === 'localhost') {
    return true;
  }
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) {
    return normalized.startsWith('127.');
  }
  if (ipVersion === 6) {
    return normalized === '::1';
  }
  return false;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function ensureWebRemoteAuth(
  options: WebRemoteServerOptions,
): Promise<WebRemoteAuthResult> {
  const authPath = getRemoteAuthPath();
  const envToken =
    process.env['TERMINAI_WEB_REMOTE_TOKEN'] ??
    process.env['GEMINI_WEB_REMOTE_TOKEN'];
  if (options.tokenOverride) {
    process.env['TERMINAI_WEB_REMOTE_TOKEN'] = options.tokenOverride;
    process.env['GEMINI_WEB_REMOTE_TOKEN'] = options.tokenOverride;
    return { token: options.tokenOverride, tokenSource: 'override', authPath };
  }
  if (options.rotateToken) {
    const token = generateToken();
    const state = createRemoteAuthState(token);
    await saveRemoteAuthState(state);
    return { token, tokenSource: 'generated', authPath };
  }
  if (envToken) {
    return { token: envToken, tokenSource: 'env', authPath };
  }

  const existing = await loadRemoteAuthState();
  if (existing) {
    return { token: null, tokenSource: 'existing', authPath };
  }

  const token = generateToken();
  const state = createRemoteAuthState(token);
  await saveRemoteAuthState(state);
  return { token, tokenSource: 'generated', authPath };
}

export async function startWebRemoteServer(
  options: WebRemoteServerOptions,
): Promise<{ server: Server; port: number; url: string }> {
  if (options.allowedOrigins.length > 0) {
    process.env['TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS'] =
      options.allowedOrigins.join(',');
    process.env['GEMINI_WEB_REMOTE_ALLOWED_ORIGINS'] =
      options.allowedOrigins.join(',');
  }

  const authResult = await ensureWebRemoteAuth(options);

  // Show warning if token only exists as hashed state
  if (authResult.tokenSource === 'existing' && !authResult.token) {
    process.stderr.write(
      '\n⚠️  Token not available (stored hashed). Use --web-remote-rotate-token to generate a new token.\n',
    );
  }

  const app = await createApp();
  const server = app.listen(options.port, options.host);
  const address = server.address();
  const actualPort =
    typeof address === 'string' || !address ? options.port : address.port;
  updateCoderAgentCardUrl(actualPort, options.host);

  // Build the user-facing URL using the token from authResult
  // NOTE: Token in URL is intentional for QR code sharing.
  // For production use, rotate tokens and use HTTPS.
  const token = authResult.token;
  const url = `http://${options.host}:${actualPort}/ui${
    token ? `?token=${encodeURIComponent(token)}` : ''
  }`;

  // Render QR code if the dependency is available, otherwise fall back to text.
  type QRCodeModule = {
    generate: (text: string, opts?: { small?: boolean }) => void;
  };

  try {
    const module = await import('qrcode-terminal');
    const qrcode = module?.default ?? (module as { generate?: unknown });
    if (qrcode && typeof qrcode.generate === 'function') {
      (qrcode as QRCodeModule).generate(url, { small: true });
    }
  } catch {
    // Ignore missing dependency; QR is optional.
  }

  process.stdout.write(
    `\n🌐 Web Remote available at: ${url}\n` +
      `   (assets served from ${path.join(process.cwd(), 'packages/web-client')})\n`,
  );
  return { server, port: actualPort, url };
}
