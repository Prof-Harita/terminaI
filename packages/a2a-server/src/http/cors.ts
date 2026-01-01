/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type express from 'express';

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }
  if (normalized === '::1') {
    return true;
  }
  return normalized.startsWith('127.');
}

function getHostnameFromHostHeader(hostHeader: string | undefined): string {
  if (!hostHeader) {
    return '';
  }

  // hostHeader may be "host:port" or "[ipv6]:port".
  try {
    const url = new URL(`http://${hostHeader}`);
    return url.hostname;
  } catch {
    return hostHeader;
  }
}

function isTauriOrAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'tauri:' || url.protocol === 'app:';
  } catch {
    return false;
  }
}

const DEFAULT_ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'X-Gemini-Nonce',
  'X-Gemini-Signature',
];

const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'];

export function createCorsAllowlist(
  allowedOrigins: string[],
): express.RequestHandler {
  const allowlist = new Set(
    allowedOrigins.map((origin) => origin.trim()).filter(Boolean),
  );

  return (req, res, next) => {
    const origin = req.header('origin');
    if (!origin) {
      return next();
    }

    const host = req.get('host');
    // const protocol = req.secure ? 'https' : 'http'; // Unused
    // Simple check: if origin matches current host, allow it.
    // We try both http and https to be robust, or trust req.protocol if configured.
    // For local dev (http), matching http://${host} is sufficient.
    const allowedSelf = `http://${host}`;
    const allowedSelfSecure = `https://${host}`;

    const requestHostname = getHostnameFromHostHeader(host);

    // Allow common desktop app origins (e.g. Tauri) since the bearer token is
    // the real security boundary.
    const tauriOriginAllowed = isTauriOrAppOrigin(origin);

    // If the server is being accessed via a loopback host, allow other loopback
    // origins regardless of port (useful for local dev servers and desktop UIs).
    let loopbackOriginAllowed = false;
    try {
      const originUrl = new URL(origin);
      loopbackOriginAllowed =
        isLoopbackHostname(requestHostname) &&
        isLoopbackHostname(originUrl.hostname);
    } catch {
      loopbackOriginAllowed = false;
    }

    if (
      !allowlist.has(origin) &&
      origin !== allowedSelf &&
      origin !== allowedSelfSecure &&
      !tauriOriginAllowed &&
      !loopbackOriginAllowed
    ) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader(
      'Access-Control-Allow-Headers',
      DEFAULT_ALLOWED_HEADERS.join(', '),
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      DEFAULT_ALLOWED_METHODS.join(', '),
    );

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return next();
  };
}
