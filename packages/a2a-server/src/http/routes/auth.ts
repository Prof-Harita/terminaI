/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import {
  AuthConflictError,
  LlmAuthManager,
} from '../../auth/llmAuthManager.js';
import { logger } from '../../utils/logger.js';

export function createAuthRouter(authManager: LlmAuthManager): Router {
  const router = Router();

  // Task 12: GET /auth/status
  router.get('/status', (req, res) => {
    void (async () => {
      try {
        const result = await authManager.getStatus();
        res.json({
          status: result.status,
          authType: result.authType ?? null,
          ...(result.message ? { message: result.message } : {}),
          ...(result.errorCode ? { errorCode: result.errorCode } : {}),
        });
      } catch (e) {
        logger.error('[AuthRouter] Error getting status:', e);
        res.status(500).json({ error: 'Failed to check auth status' });
      }
    })();
  });

  // Task 13: POST /gemini/api-key
  router.post('/gemini/api-key', (req, res) => {
    void (async () => {
      const apiKey = (req.body as { apiKey?: unknown }).apiKey;
      if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid apiKey' });
      }
      try {
        const status = await authManager.submitGeminiApiKey(apiKey);
        return res.json({
          status: status.status,
          authType: status.authType ?? null,
          ...(status.message ? { message: status.message } : {}),
          ...(status.errorCode ? { errorCode: status.errorCode } : {}),
        });
      } catch (e) {
        logger.error('[AuthRouter] Error setting API key:', e);
        return res.status(500).json({ error: 'Failed to set API key' });
      }
    })();
  });

  // Task 14: POST /gemini/oauth/start
  router.post('/gemini/oauth/start', (req, res) => {
    void (async () => {
      try {
        const { authUrl } = await authManager.startGeminiOAuth();
        res.json({ authUrl });
      } catch (e) {
        if (e instanceof AuthConflictError) {
          res.status(409).json({ error: e.message });
          return;
        }
        logger.error('[AuthRouter] Error starting OAuth:', e);
        res.status(500).json({ error: 'Failed to start OAuth' });
      }
    })();
  });

  // Task 15: POST /gemini/oauth/cancel
  router.post('/gemini/oauth/cancel', (req, res) => {
    void (async () => {
      try {
        const status = await authManager.cancelGeminiOAuth();
        res.json({
          status: status.status,
          authType: status.authType ?? null,
          ...(status.message ? { message: status.message } : {}),
          ...(status.errorCode ? { errorCode: status.errorCode } : {}),
        });
      } catch (e) {
        logger.error('[AuthRouter] Error cancelling OAuth:', e);
        res.status(500).json({ error: 'Failed to cancel OAuth' });
      }
    })();
  });

  // Task 16: POST /gemini/vertex
  router.post('/gemini/vertex', (req, res) => {
    void (async () => {
      try {
        const status = await authManager.useGeminiVertex();
        res.json({
          status: status.status,
          authType: status.authType ?? null,
          ...(status.message ? { message: status.message } : {}),
          ...(status.errorCode ? { errorCode: status.errorCode } : {}),
        });
      } catch (e) {
        logger.error('[AuthRouter] Error setting Vertex environment:', e);
        res.status(500).json({ error: 'Failed to use Vertex AI' });
      }
    })();
  });

  // Task 30: POST /gemini/clear - Clear all Gemini auth state
  router.post('/gemini/clear', (req, res) => {
    void (async () => {
      try {
        const status = await authManager.clearGeminiAuth();
        res.json({
          status: status.status,
          authType: status.authType ?? null,
          ...(status.message ? { message: status.message } : {}),
          ...(status.errorCode ? { errorCode: status.errorCode } : {}),
        });
      } catch (e) {
        logger.error('[AuthRouter] Error clearing Gemini auth:', e);
        res.status(500).json({ error: 'Failed to clear authentication' });
      }
    })();
  });

  return router;
}
