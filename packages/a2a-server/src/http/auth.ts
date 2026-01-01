/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type express from 'express';
import {
  loadRemoteAuthState,
  verifyRemoteAuthToken,
  type RemoteAuthState,
} from '../persistence/remoteAuthStore.js';

export type AuthenticatedRequest = express.Request & {
  remoteAuthToken?: string;
  rawBody?: Buffer;
};

export type AuthVerifier = {
  verifyToken: (token: string) => boolean;
  source: 'env' | 'file';
  state?: RemoteAuthState;
};

export async function loadAuthVerifier(): Promise<AuthVerifier> {
  const envToken = process.env['GEMINI_WEB_REMOTE_TOKEN'];
  if (envToken) {
    return {
      verifyToken: (token: string) => token === envToken,
      source: 'env',
    };
  }

  const state = await loadRemoteAuthState();
  if (!state) {
    throw new Error(
      'Web-remote auth is not configured. Set GEMINI_WEB_REMOTE_TOKEN or create web-remote-auth.json.',
    );
  }
  return {
    verifyToken: (token: string) => verifyRemoteAuthToken(token, state),
    source: 'file',
    state,
  };
}

function parseBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token.trim();
}

export function createAuthMiddleware(
  verifier: AuthVerifier,
  options?: { bypassPaths?: Set<string> },
): express.RequestHandler {
  const bypassPaths = options?.bypassPaths ?? new Set();
  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      return next();
    }

    for (const path of bypassPaths) {
      if (req.path === path || req.path.startsWith(`${path}/`)) {
        return next();
      }
    }

    const token = parseBearerToken(req.header('authorization'));
    if (!token || !verifier.verifyToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    (req as AuthenticatedRequest).remoteAuthToken = token;
    return next();
  };
}
