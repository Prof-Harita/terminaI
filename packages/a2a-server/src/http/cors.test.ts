/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCorsAllowlist } from './cors.js';
import {
  canListenOnLocalhost,
  listenOnLocalhost,
  closeServer,
} from '../utils/testing_utils.js';

const CAN_LISTEN = await canListenOnLocalhost();
const describeIfListen = CAN_LISTEN ? describe : describe.skip;

describeIfListen('createCorsAllowlist', () => {
  it('allows requests without Origin', async () => {
    const app = express();
    app.use(createCorsAllowlist(['https://example.com']));
    app.get('/', (_req, res) => res.status(200).send('ok'));

    const server = await listenOnLocalhost(app);
    const res = await request(server).get('/').expect(200);
    await closeServer(server);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows allowlisted origins', async () => {
    const app = express();
    app.use(createCorsAllowlist(['https://example.com']));
    app.get('/', (_req, res) => res.status(200).send('ok'));

    const server = await listenOnLocalhost(app);
    const res = await request(server)
      .get('/')
      .set('Origin', 'https://example.com')
      .expect(200);
    await closeServer(server);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://example.com',
    );
  });

  it('rejects non-allowlisted origins', async () => {
    const app = express();
    app.use(createCorsAllowlist(['https://example.com']));
    app.get('/', (_req, res) => res.status(200).send('ok'));

    const server = await listenOnLocalhost(app);
    const res = await request(server)
      .get('/')
      .set('Origin', 'https://not-allowed.test')
      .expect(403);
    await closeServer(server);
    expect(res.body.error).toBe('Origin not allowed');
  });

  it('handles preflight requests', async () => {
    const app = express();
    app.use(createCorsAllowlist(['https://example.com']));
    app.post('/', (_req, res) => res.status(200).send('ok'));

    const server = await listenOnLocalhost(app);
    const res = await request(server)
      .options('/')
      .set('Origin', 'https://example.com')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);
    await closeServer(server);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://example.com',
    );
  });
});
