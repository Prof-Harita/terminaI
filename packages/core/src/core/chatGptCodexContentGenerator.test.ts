/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Config } from '../config/config.js';
import type { OpenAIChatGptOAuthConfig } from './providerTypes.js';
import { Type, type Tool } from '@google/genai';

const mockCredentialStorage = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
}));

vi.mock('../openai_chatgpt/credentialStorage.js', () => ({
  ChatGptOAuthCredentialStorage: mockCredentialStorage,
}));

vi.mock('../openai_chatgpt/imports.js', () => ({
  tryImportFromCodexCli: vi.fn(async () => null),
  tryImportFromOpenCode: vi.fn(async () => null),
}));

import { ChatGptCodexContentGenerator } from './chatGptCodexContentGenerator.js';

function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    body,
    text: async () => '',
    json: async () => ({}),
  } as unknown as Response;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

describe('ChatGptCodexContentGenerator', () => {
  const providerConfig: OpenAIChatGptOAuthConfig = {
    baseUrl: 'https://chatgpt.com/backend-api/codex',
    model: 'gpt-5.2-codex',
  };

  const mockConfig = {
    getDebugMode: () => false,
    getProxy: () => undefined,
    getSessionId: () => 'session-123',
  } as unknown as Config;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockCredentialStorage.load.mockResolvedValue({
      serverName: 'openai-chatgpt',
      updatedAt: Date.now(),
      credentialType: 'openai-chatgpt',
      accountId: 'acct_123',
      token: {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        tokenType: 'Bearer',
      },
      lastRefresh: Date.now(),
    });
  });

  it('calls Codex responses endpoint with required headers and parses tool calls', async () => {
    const tool: Tool = {
      functionDeclarations: [
        {
          name: 'ui.click',
          description: 'click',
          parameters: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
            },
          },
        },
      ],
    };

    vi.mocked(global.fetch).mockResolvedValue(
      sseResponse([
        'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n',
        'data: {"type":"response.completed","response":{"output":[{"type":"message","content":[{"type":"output_text","text":"Hello world"}]},{"type":"function_call","name":"ui_click","arguments":"{\\"x\\":1}","call_id":"call_1"}]}}\n\n',
      ]),
    );

    const generator = new ChatGptCodexContentGenerator(
      providerConfig,
      mockConfig,
    );
    const chunks: string[] = [];
    let toolName: string | undefined;
    let toolArgX: unknown;

    const stream = await generator.generateContentStream(
      {
        model: 'gpt-5.2-codex',
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
        config: { tools: [tool] },
      },
      'prompt-id',
    );

    for await (const chunk of stream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      const text = parts
        ?.map((part) => {
          if (isPlainObject(part) && typeof part['text'] === 'string') {
            return part['text'];
          }
          return '';
        })
        .join('');
      if (text) chunks.push(text);

      const callPart = parts?.find(
        (part) => isPlainObject(part) && isPlainObject(part['functionCall']),
      );
      if (
        callPart &&
        isPlainObject(callPart) &&
        isPlainObject(callPart['functionCall'])
      ) {
        const functionCall = callPart['functionCall'];
        const name = functionCall['name'];
        const args = functionCall['args'];
        if (typeof name === 'string') {
          toolName = name;
        }
        if (isPlainObject(args)) {
          toolArgX = args['x'];
        }
      }
    }

    expect(chunks.join('')).toContain('Hello');
    expect(toolName).toBe('ui.click');
    expect(toolArgX).toBe(1);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://chatgpt.com/backend-api/codex/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access_token',
          'ChatGPT-Account-ID': 'acct_123',
          originator: 'codex_cli_rs',
          session_id: 'session-123',
        }),
      }),
    );

    const options = vi.mocked(global.fetch).mock.calls[0][1];
    const bodyText =
      isPlainObject(options) && typeof options['body'] === 'string'
        ? options['body']
        : undefined;
    expect(bodyText).toBeTruthy();
    const body = JSON.parse(bodyText ?? '{}') as Record<string, unknown>;
    expect(body['store']).toBe(false);
    expect(body['stream']).toBe(true);
    expect(body['include']).toEqual(['reasoning.encrypted_content']);
  });

  it('encodes assistant history as simple role+content objects', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      sseResponse([
        'data: {"type":"response.completed","response":{"output":[{"type":"message","content":[{"type":"output_text","text":"ok"}]}]}}\n\n',
      ]),
    );

    const generator = new ChatGptCodexContentGenerator(
      providerConfig,
      mockConfig,
    );

    const stream = await generator.generateContentStream(
      {
        model: 'gpt-5.2-codex',
        contents: [
          { role: 'user', parts: [{ text: 'hi' }] },
          { role: 'model', parts: [{ text: 'hello' }] },
          { role: 'user', parts: [{ text: 'continue' }] },
        ],
        config: {},
      },
      'prompt-id',
    );

    for await (const _chunk of stream) {
      // drain
    }

    const options = vi.mocked(global.fetch).mock.calls[0]?.[1];
    const bodyText =
      isPlainObject(options) && typeof options['body'] === 'string'
        ? options['body']
        : undefined;
    expect(bodyText).toBeTruthy();

    const body = JSON.parse(bodyText ?? '{}') as Record<string, unknown>;
    const input = body['input'];
    expect(Array.isArray(input)).toBe(true);

    const assistantItem = (input as unknown[]).find((item) => {
      if (!isPlainObject(item)) return false;
      return item['role'] === 'assistant';
    });
    expect(isPlainObject(assistantItem)).toBe(true);
    // New format expectation: { role: 'assistant', content: 'hello' }
    expect((assistantItem as Record<string, unknown>)['content']).toBe('hello');
  });

  it('converts function calls and responses to structured items with ID linkage', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      sseResponse([
        'data: {"type":"response.done","response":{"output":[]}}\n\n',
      ]),
    );

    const generator = new ChatGptCodexContentGenerator(
      providerConfig,
      mockConfig,
    );

    const stream = await generator.generateContentStream(
      {
        model: 'gpt-5.2-codex',
        contents: [
          {
            role: 'model',
            parts: [
              {
                functionCall: {
                  name: 'my_tool',
                  args: { x: 1 },
                },
              },
            ],
          },
          {
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: 'my_tool',
                  response: { result: 'success' },
                },
              },
            ],
          },
        ],
        config: {},
      },
      'prompt-id',
    );

    for await (const _chunk of stream) {
      // drain
    }

    const options = vi.mocked(global.fetch).mock.calls[0]?.[1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = JSON.parse((options as any).body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = body.input as any[];

    const callItem = input.find((i) => i.type === 'function_call');
    expect(callItem).toBeTruthy();
    expect(callItem.name).toBe('my_tool');
    expect(callItem.call_id).toBeTruthy(); // Should have generated an ID

    const outputItem = input.find((i) => i.type === 'function_call_output');
    expect(outputItem).toBeTruthy();
    expect(outputItem.output).toContain('success');
    expect(outputItem.call_id).toBe(callItem.call_id); // Linkage check
  });

  it('extracts usage metadata from terminal response', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      sseResponse([
        'data: {"type":"response.completed","response":{"output":[],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}}\n\n',
      ]),
    );

    const generator = new ChatGptCodexContentGenerator(
      providerConfig,
      mockConfig,
    );

    const stream = await generator.generateContentStream(
      {
        model: 'gpt-5.2-codex',
        contents: [],
        config: {},
      },
      'prompt-id',
    );

    let finalResponse;
    for await (const chunk of stream) {
      finalResponse = chunk;
    }

    expect(finalResponse?.usageMetadata).toEqual({
      promptTokenCount: 10,
      candidatesTokenCount: 20,
      totalTokenCount: 30,
    });
  });
});
