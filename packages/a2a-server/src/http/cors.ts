/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type express from 'express';

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

    if (
      !allowlist.has(origin) &&
      origin !== allowedSelf &&
      origin !== allowedSelfSecure
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
