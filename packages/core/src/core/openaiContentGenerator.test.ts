/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIContentGenerator } from './openaiContentGenerator.js';
import { type OpenAICompatibleConfig } from './providerTypes.js';
import type { Config } from '../config/config.js';
import {
  Type,
  type Content,
  type GenerateContentParameters,
  type Tool,
  type CountTokensParameters,
  type FunctionDeclaration,
} from '@google/genai';

describe('OpenAIContentGenerator', () => {
  const mockConfig = {
    getDebugMode: () => false,
    getProxy: () => undefined,
  } as unknown as Config;

  const providerConfig: OpenAICompatibleConfig = {
    baseUrl: 'https://api.openai.fake/v1',
    model: 'gpt-4o',
    auth: {
      type: 'api-key',
      apiKey: 'fake-key',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should generate content correctly', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: 'Hello from OpenAI' },
            finish_reason: 'stop',
          },
        ],
      }),
    } as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    };

    const response = await generator.generateContent(request, 'prompt-id');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.fake/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'fake-key',
        }),
        body: expect.stringContaining(
          '"messages":[{"role":"user","content":"Hello"}]',
        ),
      }),
    );

    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe(
      'Hello from OpenAI',
    );
    expect(response.candidates?.[0]?.finishReason).toBe('STOP');
  });

  it('should handle bearer auth', async () => {
    const bearerConfig: OpenAICompatibleConfig = {
      ...providerConfig,
      auth: { type: 'bearer', apiKey: 'fake-bearer-token' },
    };

    const generator = new OpenAIContentGenerator(bearerConfig, mockConfig);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: 'Hello' },
            finish_reason: 'stop',
          },
        ],
      }),
    } as Response);

    await generator.generateContent({ model: 'gpt-4o', contents: [] }, 'id');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-bearer-token',
        }),
      }),
    );
  });
  it('should convert tools and handle tool calls', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "Boston"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
    } as Response);

    const tools: Tool[] = [
      {
        functionDeclarations: [
          {
            name: 'get_weather',
            description: 'Get weather',
            parameters: {
              type: Type.OBJECT,
              properties: {
                location: { type: Type.STRING },
              },
            },
          },
        ],
      },
    ];

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Weather in Boston?' }] }],
      config: {
        tools,
      },
    };

    const response = await generator.generateContent(request, 'id');

    // Verify request payload includes tools
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringMatching(/"tools":\[.*"name":"get_weather"/),
      }),
    );

    // Verify response contains functionCall
    expect(response.candidates?.[0]?.content?.parts?.[0]?.functionCall).toEqual(
      {
        id: 'call_123',
        name: 'get_weather',
        args: { location: 'Boston' },
      },
    );
  });

  it('should handle function response from user', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: 'It is sunny.' },
            finish_reason: 'stop',
          },
        ],
      }),
    } as Response);

    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Weather?' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'call_123',
              name: 'get_weather',
              args: { location: 'Boston' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'get_weather',
              response: { temp: 72 },
            },
          },
        ],
      },
    ];

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents,
    };

    await generator.generateContent(request, 'id');

    // Verify request payload maps function response to tool message with ID
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"role":"tool"'),
      }),
    );
    // Verify it preserves the tool call ID (avoid name-based heuristics when possible)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"tool_call_id":"call_123"'),
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"content":"{\\"temp\\":72}"'),
      }),
    );
  });

  it('should send parametersJsonSchema (including required fields) when provided', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'run_terminal_command',
                    arguments: '{"command":"hostnamectl"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
    } as Response);

    const fn: FunctionDeclaration = {
      name: 'run_terminal_command',
      description: 'Run a command',
      parametersJsonSchema: {
        type: 'object',
        properties: {
          command: { type: 'string' },
        },
        required: ['command'],
      },
    };

    const tools: Tool[] = [{ functionDeclarations: [fn] }];

    await generator.generateContent(
      {
        model: 'gpt-4o',
        contents: [{ role: 'user', parts: [{ text: 'Which laptop?' }] }],
        config: { tools },
      },
      'id',
    );

    const fetchArgs = vi.mocked(global.fetch).mock.calls[0]?.[1] as
      | { body?: string }
      | undefined;
    expect(fetchArgs?.body).toContain('"required":["command"]');
    expect(fetchArgs?.body).toContain('"properties":{"command"');
  });

  it('should parse tool arguments when returned as an object', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: { location: 'Boston' },
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
    } as Response);

    const tools: Tool[] = [
      {
        functionDeclarations: [
          {
            name: 'get_weather',
            description: 'Get weather',
            parameters: {
              type: Type.OBJECT,
              properties: {
                location: { type: Type.STRING },
              },
            },
          },
        ],
      },
    ];

    const response = await generator.generateContent(
      {
        model: 'gpt-4o',
        contents: [{ role: 'user', parts: [{ text: 'Weather?' }] }],
        config: { tools },
      },
      'id',
    );

    expect(response.candidates?.[0]?.content?.parts?.[0]?.functionCall).toEqual(
      {
        id: 'call_123',
        name: 'get_weather',
        args: { location: 'Boston' },
      },
    );
  });

  it('should handle system instructions', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: 'Understood.' },
            finish_reason: 'stop',
          },
        ],
      }),
    } as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config: {
        systemInstruction: 'Be concise.',
      },
    };

    await generator.generateContent(request, 'id');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining(
          '{"role":"system","content":"Be concise."}',
        ),
      }),
    );
  });

  it('should throw error for unsupported modalities with inlineData', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Describe this image:' },
            { inlineData: { mimeType: 'image/png', data: 'base64data' } },
          ],
        },
      ],
    };

    await expect(generator.generateContent(request, 'id')).rejects.toThrow(
      'The OpenAI provider currently only supports text. To use images or other files, please switch to the Gemini provider.',
    );
  });

  it('should throw error for unsupported modalities with fileData', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Process this file:' },
            { fileData: { mimeType: 'application/pdf', fileUri: 'uri' } },
          ],
        },
      ],
    };

    await expect(generator.generateContent(request, 'id')).rejects.toThrow(
      'The OpenAI provider currently only supports text. To use images or other files, please switch to the Gemini provider.',
    );
  });

  it('should throw error for unsupported modalities in streaming', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType: 'image/png', data: 'data' } }],
        },
      ],
    };

    await expect(
      generator.generateContentStream(request, 'id'),
    ).rejects.toThrow(
      'The OpenAI provider currently only supports text. To use images or other files, please switch to the Gemini provider.',
    );
  });

  it('should count tokens using local estimation', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const request: CountTokensParameters = {
      model: 'gpt-4o',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Hello world' }],
        },
      ],
    };

    const response = await generator.countTokens(request);
    expect(response.totalTokens).toBeGreaterThan(0);
    expect(typeof response.totalTokens).toBe('number');
  });

  it('should map non-2xx responses to errors', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    } as Response);

    await expect(
      generator.generateContent({ model: 'gpt-4o', contents: [] }, 'id'),
    ).rejects.toThrow(
      'OpenAI compatible backend error (429): Rate limit exceeded',
    );
  }, 10000);

  it('should handle streaming text deltas', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: [DONE]\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
    };

    const gen = await generator.generateContentStream(request, 'id');
    const results = [];
    for await (const res of gen) {
      results.push(res);
    }
    expect(results).toHaveLength(1);
    expect(results[0].candidates?.[0]?.content?.parts?.[0]?.text).toBe('Hello');
  });

  it('should accumulate multi-chunk streaming tool calls', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const mockReader = {
      read: vi
        .fn()
        // First chunk: tool call with partial args
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_abc","type":"function","function":{"name":"get_weather","arguments":"{\\"loc"}}]}}]}\n\n',
          ),
        })
        // Second chunk: more args
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"ation\\": \\"Boston\\"}"}}]}}]}\n\n',
          ),
        })
        // Third chunk: finish
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"finish_reason":"tool_calls"}]}\n\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: [DONE]\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Weather?' }] }],
    };

    const gen = await generator.generateContentStream(request, 'id');
    const results = [];
    for await (const res of gen) {
      results.push(res);
    }

    // Should have one result with the accumulated tool call
    expect(results.length).toBeGreaterThan(0);
    const lastResult = results[results.length - 1];
    const parts = lastResult.candidates?.[0]?.content?.parts;
    expect((lastResult.functionCalls?.length || 0) > 0).toBe(true);
    expect(parts?.some((p: { functionCall?: unknown }) => p.functionCall)).toBe(
      true,
    );
  });

  it('should handle streaming finish chunks with message.content (no deltas)', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"message":{"content":"Hello from message"},"finish_reason":"stop"}]}\n\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: [DONE]\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
    };

    const gen = await generator.generateContentStream(request, 'id');
    const results = [];
    for await (const res of gen) {
      results.push(res);
    }

    expect(results).toHaveLength(1);
    expect(results[0].candidates?.[0]?.content?.parts?.[0]?.text).toBe(
      'Hello from message',
    );
    expect(results[0].candidates?.[0]?.finishReason).toBe('STOP');
  });

  it('should handle streaming finish chunks with message.tool_calls (no deltas)', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"message":{"tool_calls":[{"id":"call_abc","type":"function","function":{"name":"get_weather","arguments":"{\\"location\\":\\"Boston\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: [DONE]\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Weather?' }] }],
    };

    const gen = await generator.generateContentStream(request, 'id');
    const results = [];
    for await (const res of gen) {
      results.push(res);
    }

    expect(results).toHaveLength(1);
    expect(results[0].functionCalls?.[0]?.name).toBe('get_weather');
    expect(
      results[0].candidates?.[0]?.content?.parts?.[0]?.functionCall?.name,
    ).toBe('get_weather');
  });

  it('should handle malformed/partial SSE chunks gracefully', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const mockReader = {
      read: vi
        .fn()
        // Valid chunk
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
          ),
        })
        // Malformed chunk (invalid JSON)
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {invalid json}\n\n'),
        })
        // Another valid chunk
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: [DONE]\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
    };

    // Should not throw, should skip malformed chunk
    const gen = await generator.generateContentStream(request, 'id');
    const results = [];
    for await (const res of gen) {
      results.push(res);
    }

    // Should have 2 valid results (Hello and World)
    expect(results.length).toBe(2);
    expect(results[0].candidates?.[0]?.content?.parts?.[0]?.text).toBe('Hello');
    expect(results[1].candidates?.[0]?.content?.parts?.[0]?.text).toBe(
      ' World',
    );
  });

  it('should handle finish-only chunks (no content)', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Text"}}]}\n\n',
          ),
        })
        // Finish chunk with only finish_reason, no content
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: [DONE]\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
    };

    const gen = await generator.generateContentStream(request, 'id');
    const results = [];
    for await (const res of gen) {
      results.push(res);
    }

    // Should have 2 results: text content and finish
    expect(results.length).toBe(2);
    expect(results[0].candidates?.[0]?.content?.parts?.[0]?.text).toBe('Text');
    expect(results[1].candidates?.[0]?.finishReason).toBe('STOP');
  });

  it('should handle abort signal during streaming', async () => {
    const generator = new OpenAIContentGenerator(providerConfig, mockConfig);

    const abortController = new AbortController();
    let readCallCount = 0;

    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        readCallCount++;
        if (readCallCount === 1) {
          return {
            done: false,
            value: new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            ),
          };
        }
        // Simulate abort after first read
        abortController.abort();
        // Stream interrupted
        return { done: true };
      }),
      releaseLock: vi.fn(),
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as Response);

    const request: GenerateContentParameters = {
      model: 'gpt-4o',
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      config: {
        abortSignal: abortController.signal,
      },
    };

    const gen = await generator.generateContentStream(request, 'id');
    const results = [];
    for await (const res of gen) {
      results.push(res);
    }

    // Should have gotten at least one result before abort
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });
});
