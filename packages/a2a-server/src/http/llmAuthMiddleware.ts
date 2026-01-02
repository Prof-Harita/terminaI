/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import { LlmAuthManager } from '../auth/llmAuthManager.js';

export function createLlmAuthMiddleware(authManager: LlmAuthManager) {
  return (_req: Request, res: Response, next: NextFunction) => {
    void authManager
      .getStatus()
      .then((check) => {
        if (check.status !== 'ok') {
          res.status(503).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
            details: check,
          });
          return;
        }
        next();
      })
      .catch((err) => {
        // Fail closed: if status check fails, treat as auth required.
        res.status(503).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          details: {
            status: 'error',
            authType: null,
            message:
              err instanceof Error ? err.message : 'Auth status check failed',
          },
        });
      });
  };
}
