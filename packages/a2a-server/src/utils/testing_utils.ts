/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Task as SDKTask,
  TaskStatusUpdateEvent,
  SendStreamingMessageSuccessResponse,
} from '@a2a-js/sdk';
import {
  ApprovalMode,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES,
  DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD,
  GeminiClient,
  HookSystem,
} from '@terminai/core';
import { createMockMessageBus } from '@terminai/core/test-utils';
import type { Config, Storage } from '@terminai/core';
import type express from 'express';
import type { Server } from 'node:http';
import { expect, vi } from 'vitest';
import crypto from 'node:crypto';
import net from 'node:net';
import { buildSignaturePayload, computeBodyHash } from '../http/replay.js';

export const TEST_REMOTE_TOKEN = 'test-remote-token';

let canListenCache: Promise<boolean> | undefined;

export async function canListenOnLocalhost(): Promise<boolean> {
  if (!canListenCache) {
    canListenCache = new Promise((resolve) => {
      try {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.listen(0, '127.0.0.1', () => {
          server.close(() => resolve(true));
        });
      } catch (_error) {
        resolve(false);
      }
    });
  }
  return canListenCache;
}

export async function listenOnLocalhost(app: express.Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', (err) => reject(err));
  });
}

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export function createMockConfig(
  overrides: Partial<Config> = {},
): Partial<Config> {
  const mockConfig = {
    getToolRegistry: vi.fn().mockReturnValue({
      getTool: vi.fn(),
      getAllToolNames: vi.fn().mockReturnValue([]),
      getAllTools: vi.fn().mockReturnValue([]),
      getToolsByServer: vi.fn().mockReturnValue([]),
    }),
    getApprovalMode: vi.fn().mockReturnValue(ApprovalMode.DEFAULT),
    getIdeMode: vi.fn().mockReturnValue(false),
    isInteractive: () => true,
    getAllowedTools: vi.fn().mockReturnValue([]),
    getWorkspaceContext: vi.fn().mockReturnValue({
      isPathWithinWorkspace: () => true,
    }),
    getTargetDir: () => '/test',
    getCheckpointingEnabled: vi.fn().mockReturnValue(false),
    storage: {
      getProjectTempDir: () => '/tmp',
      getProjectTempCheckpointsDir: () => '/tmp/checkpoints',
    } as Storage,
    getTruncateToolOutputThreshold: () =>
      DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD,
    getTruncateToolOutputLines: () => DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES,
    getActiveModel: vi.fn().mockReturnValue(DEFAULT_GEMINI_MODEL),
    getDebugMode: vi.fn().mockReturnValue(false),
    getContentGeneratorConfig: vi.fn().mockReturnValue({ model: 'gemini-pro' }),
    getModel: vi.fn().mockReturnValue('gemini-pro'),
    getUsageStatisticsEnabled: vi.fn().mockReturnValue(false),
    setFallbackModelHandler: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    getProxy: vi.fn().mockReturnValue(undefined),
    getHistory: vi.fn().mockReturnValue([]),
    getEmbeddingModel: vi.fn().mockReturnValue('text-embedding-004'),
    getSessionId: vi.fn().mockReturnValue('test-session-id'),
    getUserTier: vi.fn(),
    getEnableMessageBusIntegration: vi.fn().mockReturnValue(false),
    getMessageBus: vi.fn(),
    getPolicyEngine: vi.fn(),
    getEnableExtensionReloading: vi.fn().mockReturnValue(false),
    getEnableHooks: vi.fn().mockReturnValue(false),
    getMcpClientManager: vi.fn().mockReturnValue({
      getMcpServers: vi.fn().mockReturnValue({}),
    }),
    getGitService: vi.fn(),
    ...overrides,
  } as unknown as Config;
  mockConfig.getMessageBus = vi.fn().mockReturnValue(createMockMessageBus());
  mockConfig.getHookSystem = vi
    .fn()
    .mockReturnValue(new HookSystem(mockConfig));

  mockConfig.getGeminiClient = vi
    .fn()
    .mockReturnValue(new GeminiClient(mockConfig));
  return mockConfig;
}

export function createStreamMessageRequest(
  text: string,
  messageId: string,
  taskId?: string,
) {
  const request: {
    jsonrpc: string;
    id: string;
    method: string;
    params: {
      message: {
        kind: string;
        role: string;
        parts: [{ kind: string; text: string }];
        messageId: string;
      };
      metadata: {
        coderAgent: {
          kind: string;
          workspacePath: string;
        };
      };
      taskId?: string;
    };
  } = {
    jsonrpc: '2.0',
    id: '1',
    method: 'message/stream',
    params: {
      message: {
        kind: 'message',
        role: 'user',
        parts: [{ kind: 'text', text }],
        messageId,
      },
      metadata: {
        coderAgent: {
          kind: 'agent-settings',
          workspacePath: '/tmp',
        },
      },
    },
  };

  if (taskId) {
    request.params.taskId = taskId;
  }

  return request;
}

export function createAuthHeader(token: string = TEST_REMOTE_TOKEN) {
  return { Authorization: `Bearer ${token}` };
}

export function createSignedHeaders(
  method: string,
  path: string,
  body: unknown,
  token: string = TEST_REMOTE_TOKEN,
  nonce: string = crypto.randomUUID(),
) {
  const rawBody = body ? JSON.stringify(body) : '';
  const bodyHash = computeBodyHash(rawBody);
  const payload = buildSignaturePayload({
    method,
    path,
    bodyHash,
    nonce,
  });
  const signature = crypto
    .createHmac('sha256', token)
    .update(payload)
    .digest('hex');
  return {
    Authorization: `Bearer ${token}`,
    'X-Gemini-Nonce': nonce,
    'X-Gemini-Signature': signature,
  };
}

export function assertUniqueFinalEventIsLast(
  events: SendStreamingMessageSuccessResponse[],
) {
  // Final event is input-required & final
  const finalEvent = events[events.length - 1].result as TaskStatusUpdateEvent;
  expect(finalEvent.metadata?.['coderAgent']).toMatchObject({
    kind: 'state-change',
  });
  expect(finalEvent.status?.state).toBe('input-required');
  expect(finalEvent.final).toBe(true);

  // There is only one event with final and its the last
  expect(
    events.filter((e) => (e.result as TaskStatusUpdateEvent).final).length,
  ).toBe(1);
  expect(
    events.findIndex((e) => (e.result as TaskStatusUpdateEvent).final),
  ).toBe(events.length - 1);
}

export function assertTaskCreationAndWorkingStatus(
  events: SendStreamingMessageSuccessResponse[],
) {
  // Initial task creation event
  const taskEvent = events[0].result as SDKTask;
  expect(taskEvent.kind).toBe('task');
  expect(taskEvent.status.state).toBe('submitted');

  // Status update: working
  const workingEvent = events[1].result as TaskStatusUpdateEvent;
  expect(workingEvent.kind).toBe('status-update');
  expect(workingEvent.status.state).toBe('working');
}
