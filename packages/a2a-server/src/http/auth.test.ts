/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthMiddleware, type AuthVerifier } from './auth.js';
import {
  canListenOnLocalhost,
  listenOnLocalhost,
  closeServer,
} from '../utils/testing_utils.js';

const CAN_LISTEN = await canListenOnLocalhost();
const describeIfListen = CAN_LISTEN ? describe : describe.skip;

describeIfListen('createAuthMiddleware', () => {
  const verifier: AuthVerifier = {
    verifyToken: (token: string) => token === 'good-token',
    source: 'env',
  };

  it('rejects missing or invalid tokens', async () => {
    const app = express();
    app.use(createAuthMiddleware(verifier));
    app.get('/protected', (_req, res) => res.status(200).send('ok'));

    const server = await listenOnLocalhost(app);
    await request(server).get('/protected').expect(401);
    await request(server)
      .get('/protected')
      .set('Authorization', 'Bearer bad-token')
      .expect(401);
    await closeServer(server);
  });

  it('allows valid tokens', async () => {
    const app = express();
    app.use(createAuthMiddleware(verifier));
    app.get('/protected', (_req, res) => res.status(200).send('ok'));

    const server = await listenOnLocalhost(app);
    await request(server)
      .get('/protected')
      .set('Authorization', 'Bearer good-token')
      .expect(200);
    await closeServer(server);
  });

  it('bypasses configured paths', async () => {
    const app = express();
    app.use(
      createAuthMiddleware(verifier, {
        bypassPaths: new Set(['/healthz']),
      }),
    );
    app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

    const server = await listenOnLocalhost(app);
    await request(server).get('/healthz').expect(200);
    await closeServer(server);
  });
});
