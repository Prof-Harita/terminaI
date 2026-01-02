/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthType } from '@terminai/core';
import {
  AuthConflictError,
  type LlmAuthManager,
} from '../auth/llmAuthManager.js';
import { createAuthRouter } from './routes/auth.js';

describe('Auth routes contract (Task 33)', () => {
  let app: express.Express;
  let manager: LlmAuthManager;

  beforeEach(() => {
    // Mock manager with default behaviors
    manager = {
      getStatus: vi.fn(),
      submitGeminiApiKey: vi.fn(),
      startGeminiOAuth: vi.fn(),
      cancelGeminiOAuth: vi.fn(),
      useGeminiVertex: vi.fn(),
      clearGeminiAuth: vi.fn(),
    } as unknown as LlmAuthManager;

    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(manager));
  });

  describe('GET /auth/status', () => {
    it('returns status/authType/message/errorCode shape', async () => {
      manager.getStatus = vi.fn().mockResolvedValue({
        status: 'required',
        authType: AuthType.LOGIN_WITH_GOOGLE,
        message: 'OAuth credentials missing',
        errorCode: 'network_error',
      });

      const res = await request(app).get('/auth/status').expect(200);
      expect(res.body).toEqual({
        status: 'required',
        authType: AuthType.LOGIN_WITH_GOOGLE,
        message: 'OAuth credentials missing',
        errorCode: 'network_error',
      });
    });

    it('omits optional fields when undefined', async () => {
      manager.getStatus = vi.fn().mockResolvedValue({
        status: 'ok',
        authType: AuthType.USE_GEMINI,
      });

      const res = await request(app).get('/auth/status').expect(200);
      expect(res.body).toEqual({
        status: 'ok',
        authType: AuthType.USE_GEMINI,
      });
      expect(res.body).not.toHaveProperty('message');
      expect(res.body).not.toHaveProperty('errorCode');
    });
  });

  describe('POST /auth/gemini/api-key', () => {
    it('validates body and returns 400 on empty apiKey', async () => {
      await request(app)
        .post('/auth/gemini/api-key')
        .send({ apiKey: '' })
        .expect(400);
      expect(manager.submitGeminiApiKey).not.toHaveBeenCalled();
    });

    it('validates body and returns 400 on missing apiKey', async () => {
      await request(app).post('/auth/gemini/api-key').send({}).expect(400);
      expect(manager.submitGeminiApiKey).not.toHaveBeenCalled();
    });

    it('accepts valid apiKey and returns status response', async () => {
      manager.submitGeminiApiKey = vi.fn().mockResolvedValue({
        status: 'ok',
        authType: AuthType.USE_GEMINI,
      });

      const res = await request(app)
        .post('/auth/gemini/api-key')
        .send({ apiKey: 'test-api-key-123' })
        .expect(200);

      expect(manager.submitGeminiApiKey).toHaveBeenCalledWith(
        'test-api-key-123',
      );
      expect(res.body).toEqual({
        status: 'ok',
        authType: AuthType.USE_GEMINI,
      });
    });
  });

  describe('POST /auth/gemini/oauth/start', () => {
    it('returns 409 if OAuth already in progress', async () => {
      manager.startGeminiOAuth = vi
        .fn()
        .mockRejectedValue(new AuthConflictError('OAuth already in progress'));

      const res = await request(app)
        .post('/auth/gemini/oauth/start')
        .send({})
        .expect(409);
      expect(res.body.error).toBe('OAuth already in progress');
      expect(manager.startGeminiOAuth).toHaveBeenCalled();
    });

    it('returns authUrl on successful start', async () => {
      manager.startGeminiOAuth = vi.fn().mockResolvedValue({
        authUrl: 'https://accounts.google.com/oauth/authorize?client_id=...',
      });

      const res = await request(app)
        .post('/auth/gemini/oauth/start')
        .send({})
        .expect(200);

      expect(res.body).toEqual({
        authUrl: 'https://accounts.google.com/oauth/authorize?client_id=...',
      });
    });
  });

  describe('POST /auth/gemini/oauth/cancel', () => {
    it('cancels OAuth and returns status', async () => {
      manager.cancelGeminiOAuth = vi.fn().mockResolvedValue({
        status: 'required',
        authType: null,
        message: 'OAuth cancelled',
      });

      const res = await request(app)
        .post('/auth/gemini/oauth/cancel')
        .send({})
        .expect(200);

      expect(manager.cancelGeminiOAuth).toHaveBeenCalled();
      expect(res.body).toEqual({
        status: 'required',
        authType: null,
        message: 'OAuth cancelled',
      });
    });
  });

  describe('POST /auth/gemini/vertex', () => {
    it('configures Vertex AI and returns status', async () => {
      manager.useGeminiVertex = vi.fn().mockResolvedValue({
        status: 'ok',
        authType: AuthType.USE_VERTEX_AI,
      });

      const res = await request(app)
        .post('/auth/gemini/vertex')
        .send({ project: 'my-project', location: 'us-central1' })
        .expect(200);

      expect(manager.useGeminiVertex).toHaveBeenCalled();
      expect(res.body).toEqual({
        status: 'ok',
        authType: AuthType.USE_VERTEX_AI,
      });
    });
  });

  describe('POST /auth/gemini/clear', () => {
    it('clears auth state and returns status', async () => {
      manager.clearGeminiAuth = vi.fn().mockResolvedValue({
        status: 'required',
        authType: null,
        message: 'Authentication cleared',
      });

      const res = await request(app)
        .post('/auth/gemini/clear')
        .send({})
        .expect(200);

      expect(manager.clearGeminiAuth).toHaveBeenCalled();
      expect(res.body).toEqual({
        status: 'required',
        authType: null,
        message: 'Authentication cleared',
      });
    });
  });
});
