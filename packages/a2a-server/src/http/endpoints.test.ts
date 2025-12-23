/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import type express from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createApp, updateCoderAgentCardUrl } from './app.js';
import type { TaskMetadata } from '../types.js';
import {
  createAuthHeader,
  createMockConfig,
  createSignedHeaders,
  TEST_REMOTE_TOKEN,
  canListenOnLocalhost,
  listenOnLocalhost,
  closeServer,
} from '../utils/testing_utils.js';
import { debugLogger, type Config } from '@google/gemini-cli-core';

// Mock the logger to avoid polluting test output
// Comment out to help debug
vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock Task.create to avoid its complex setup
vi.mock('../agent/task.js', () => {
  class MockTask {
    id: string;
    contextId: string;
    taskState = 'submitted';
    config = {
      getContentGeneratorConfig: vi
        .fn()
        .mockReturnValue({ model: 'gemini-pro' }),
    };
    geminiClient = {
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    constructor(id: string, contextId: string) {
      this.id = id;
      this.contextId = contextId;
    }
    static create = vi
      .fn()
      .mockImplementation((id, contextId) =>
        Promise.resolve(new MockTask(id, contextId)),
      );
    getMetadata = vi.fn().mockImplementation(async () => ({
      id: this.id,
      contextId: this.contextId,
      taskState: this.taskState,
      model: 'gemini-pro',
      mcpServers: [],
      availableTools: [],
    }));
  }
  return { Task: MockTask };
});

vi.mock('../config/config.js', async () => {
  const actual = await vi.importActual('../config/config.js');
  return {
    ...actual,
    loadConfig: vi
      .fn()
      .mockImplementation(async () => createMockConfig({}) as Config),
  };
});

const CAN_LISTEN = await canListenOnLocalhost();
const describeIfListen = CAN_LISTEN ? describe : describe.skip;

describeIfListen('Agent Server Endpoints', () => {
  let app: express.Express;
  let server: Server;
  let testWorkspace: string;

  const createTask = (contextId: string) =>
    request(app)
      .post('/tasks')
      .set(
        createSignedHeaders('POST', '/tasks', {
          contextId,
          agentSettings: {
            kind: 'agent-settings',
            workspacePath: testWorkspace,
          },
        }),
      )
      .set('Content-Type', 'application/json')
      .send({
        contextId,
        agentSettings: {
          kind: 'agent-settings',
          workspacePath: testWorkspace,
        },
      });

  beforeAll(async () => {
    process.env['GEMINI_WEB_REMOTE_TOKEN'] = TEST_REMOTE_TOKEN;
    // Create a unique temporary directory for the workspace to avoid conflicts
    testWorkspace = fs.mkdtempSync(
      path.join(os.tmpdir(), 'gemini-agent-test-'),
    );
    app = await createApp();
    server = await listenOnLocalhost(app);
    const port = (server.address() as AddressInfo).port;
    updateCoderAgentCardUrl(port);
  });

  afterAll(async () => {
    if (server) {
      await closeServer(server);
    }
    delete process.env['GEMINI_WEB_REMOTE_TOKEN'];

    if (testWorkspace) {
      try {
        fs.rmSync(testWorkspace, { recursive: true, force: true });
      } catch (e) {
        debugLogger.warn(`Could not remove temp dir '${testWorkspace}':`, e);
      }
    }
  });

  it('should create a new task via POST /tasks', async () => {
    const response = await createTask('test-context');
    expect(response.status).toBe(201);
    expect(response.body).toBeTypeOf('string'); // Should return the task ID
  }, 7000);

  it('should get metadata for a specific task via GET /tasks/:taskId/metadata', async () => {
    const createResponse = await createTask('test-context-2');
    const taskId = createResponse.body;
    const response = await request(app)
      .get(`/tasks/${taskId}/metadata`)
      .set(createAuthHeader());
    expect(response.status).toBe(200);
    expect(response.body.metadata.id).toBe(taskId);
  }, 6000);

  it('should get metadata for all tasks via GET /tasks/metadata', async () => {
    const createResponse = await createTask('test-context-3');
    const taskId = createResponse.body;
    const response = await request(app)
      .get('/tasks/metadata')
      .set(createAuthHeader());
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    const taskMetadata = response.body.find(
      (m: TaskMetadata) => m.id === taskId,
    );
    expect(taskMetadata).toBeDefined();
  });

  it('should return 404 for a non-existent task', async () => {
    const response = await request(app)
      .get('/tasks/fake-task/metadata')
      .set(createAuthHeader());
    expect(response.status).toBe(404);
  });

  it('should return agent metadata via GET /.well-known/agent-card.json', async () => {
    const response = await request(app)
      .get('/.well-known/agent-card.json')
      .set(createAuthHeader());
    const port = (server.address() as AddressInfo).port;
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Gemini SDLC Agent');
    expect(response.body.url).toBe(`http://localhost:${port}/`);
  });
});
