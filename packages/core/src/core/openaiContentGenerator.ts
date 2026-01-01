/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type CountTokensResponse,
  type GenerateContentParameters,
  type CountTokensParameters,
  type EmbedContentResponse,
  type EmbedContentParameters,
  type Content,
  type ContentUnion,
  GenerateContentResponse,
  type Candidate,
  type FinishReason,
  type Tool,
  type ToolListUnion,
  type Schema,
} from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { OpenAICompatibleConfig } from './providerTypes.js';
import type { Config } from '../config/config.js';
import { toContents } from '../code_assist/converter.js';
import { ProxyAgent } from 'undici';
import { estimateTokenCountSync } from '../utils/tokenCalculation.js';

interface OpenAIChoice {
  message?: {
    content?: string;
    tool_calls?: OpenAIToolCall[];
  };
  delta?: {
    content?: string;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason?: string;
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  index?: number;
  function: {
    name?: string; // Can be partial in stream delta
    arguments?: string; // Can be partial in stream delta
  };
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export class OpenAIContentGenerator implements ContentGenerator {
  constructor(
    private readonly config: OpenAICompatibleConfig,
    private readonly globalConfig: Config,
  ) {}

  private hasUnsupportedModalities(contents: Content[]): boolean {
    for (const content of contents) {
      if (content.parts) {
        for (const part of content.parts) {
          if (part && typeof part === 'object') {
            if ('inlineData' in part || 'fileData' in part) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  private partUnionToText(part: unknown): string {
    if (typeof part === 'string') {
      return part;
    }
    if (part && typeof part === 'object') {
      const maybe = part as { text?: unknown };
      if (typeof maybe.text === 'string') {
        return maybe.text;
      }
    }
    return '';
  }

  private contentUnionToText(content: ContentUnion | undefined): string {
    if (!content) {
      return '';
    }
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content.map((p) => this.partUnionToText(p)).join('');
    }
    if (content && typeof content === 'object') {
      const maybeContent = content as { parts?: unknown };
      if (Array.isArray(maybeContent.parts)) {
        return maybeContent.parts.map((p) => this.partUnionToText(p)).join('');
      }
      return this.partUnionToText(content);
    }
    return '';
  }

  private normalizeTools(tools: ToolListUnion | undefined): Tool[] {
    if (!tools) {
      return [];
    }
    return Array.isArray(tools) ? (tools as Tool[]) : [tools as Tool];
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const contents = toContents(request.contents);
    if (this.hasUnsupportedModalities(contents)) {
      throw new Error(
        'This provider is configured for text-only. Images and files are not supported.',
      );
    }
    const messages = this.convertContentsToOpenAIMessages(contents);

    const systemText = this.contentUnionToText(
      request.config?.systemInstruction,
    );
    if (systemText) {
      messages.unshift({ role: 'system', content: systemText });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      model: request.model || this.config.model,
      messages,
      stream: false,
    };

    const tools = this.normalizeTools(request.config?.tools);
    if (tools.length > 0) {
      body['tools'] = this.convertTools(tools);
    }

    if (request.config?.maxOutputTokens) {
      body['max_tokens'] = request.config.maxOutputTokens;
    }
    if (request.config?.temperature !== undefined) {
      body['temperature'] = request.config.temperature;
    }

    const response = await this.fetchOpenAI(
      '/chat/completions',
      body,
      request.config?.abortSignal,
    );
    const data = (await response.json()) as OpenAIResponse;

    return this.convertOpenAIResponseToGemini(data);
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const contents = toContents(request.contents);
    if (this.hasUnsupportedModalities(contents)) {
      throw new Error(
        'This provider is configured for text-only. Images and files are not supported.',
      );
    }
    const messages = this.convertContentsToOpenAIMessages(contents);

    const systemText = this.contentUnionToText(
      request.config?.systemInstruction,
    );
    if (systemText) {
      messages.unshift({ role: 'system', content: systemText });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      model: request.model || this.config.model,
      messages,
      stream: true,
    };

    const tools = this.normalizeTools(request.config?.tools);
    if (tools.length > 0) {
      body['tools'] = this.convertTools(tools);
    }

    // Add generation config
    if (request.config?.maxOutputTokens)
      body['max_tokens'] = request.config.maxOutputTokens;
    if (request.config?.temperature !== undefined)
      body['temperature'] = request.config.temperature;

    const response = await this.fetchOpenAI(
      '/chat/completions',
      body,
      request.config?.abortSignal,
    );

    if (!response.body) {
      throw new Error('No response body from OpenAI stream');
    }

    const debugMode = this.globalConfig.getDebugMode();

    return (async function* () {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Buffer for streaming tool calls
      const pendingToolCalls: Record<
        number,
        {
          id: string;
          type: 'function';
          function: { name: string; arguments: string };
        }
      > = {};

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                const delta = data.choices?.[0]?.delta;
                const finishReason =
                  data.choices?.[0]?.finish_reason?.toUpperCase();

                // 1. Handle Text Content
                if (delta?.content) {
                  yield {
                    candidates: [
                      {
                        content: {
                          role: 'model',
                          parts: [{ text: delta.content }],
                        },
                      },
                    ],
                  } as GenerateContentResponse;
                }

                // 2. Accumulate Tool Calls
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const index = tc.index || 0;
                    if (!pendingToolCalls[index]) {
                      pendingToolCalls[index] = {
                        id: tc.id || '',
                        type: 'function',
                        function: {
                          name: tc.function?.name || '',
                          arguments: tc.function?.arguments || '',
                        },
                      };
                    } else {
                      if (tc.function?.arguments) {
                        pendingToolCalls[index].function.arguments +=
                          tc.function.arguments;
                      }
                      if (tc.function?.name) {
                        pendingToolCalls[index].function.name +=
                          tc.function.name;
                      }
                    }
                  }
                }

                // 3. Handle Finish
                if (finishReason) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const parts: any[] = [];

                  // If we have buffered tool calls, finalize them now
                  const toolIndices = Object.keys(pendingToolCalls)
                    .map(Number)
                    .sort((a, b) => a - b);
                  for (const index of toolIndices) {
                    const tc = pendingToolCalls[index];
                    try {
                      const args = JSON.parse(tc.function.arguments);
                      parts.push({
                        functionCall: {
                          name: tc.function.name,
                          args,
                        },
                      });
                    } catch (e) {
                      if (debugMode) {
                        console.error(
                          '[OpenAI Provider] Failed to parse streamed arguments:',
                          e,
                        );
                      }
                    }
                  }

                  yield {
                    candidates: [
                      {
                        content: {
                          role: 'model',
                          parts,
                        },
                        finishReason: finishReason as FinishReason,
                      },
                    ],
                  } as GenerateContentResponse;
                }
              } catch (e) {
                if (debugMode) {
                  console.error(
                    '[OpenAI Provider] Error parsing stream chunk:',
                    e,
                  );
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    })();
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // OpenAI doesn't have a standard countTokens endpoint compatible with all providers
    // Use local heuristic estimation
    const contents = toContents(request.contents);
    let totalTokens = 0;
    for (const content of contents) {
      if (content.parts) {
        totalTokens += estimateTokenCountSync(content.parts);
      }
    }
    return {
      totalTokens,
    };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    throw new Error(
      'Embeddings not supported for OpenAI-compatible provider yet.',
    );
  }

  private async fetchOpenAI(
    endpoint: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.auth) {
      if (this.config.auth.type === 'bearer' && this.config.auth.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.auth.apiKey}`;
      } else if (
        this.config.auth.type === 'api-key' &&
        this.config.auth.apiKey
      ) {
        headers['x-api-key'] = this.config.auth.apiKey;
      }
      // If none, strictly no auth header
    }

    if (this.globalConfig.getDebugMode()) {
      console.error(`[OpenAI Provider] Requesting ${url}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    };

    const proxy = this.globalConfig.getProxy();
    if (proxy) {
      options.dispatcher = new ProxyAgent(proxy);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI Provider Error (${response.status}): ${text}`);
    }

    return response;
  }

  private convertTools(tools: Tool[]): OpenAITool[] {
    const openAITools: OpenAITool[] = [];
    for (const tool of tools) {
      if (tool.functionDeclarations) {
        for (const fn of tool.functionDeclarations) {
          openAITools.push({
            type: 'function',
            function: {
              name: fn.name || 'unknown_tool',
              description: fn.description,
              parameters: fn.parameters
                ? this.convertSchemaToOpenAI(fn.parameters)
                : undefined,
            },
          });
        }
      }
    }
    return openAITools;
  }

  private convertSchemaToOpenAI(schema: Schema): Record<string, unknown> {
    // Convert Gemini Schema to JSON Schema format
    // Gemini uses Type enum (OBJECT, STRING, etc.) while JSON Schema uses lowercase strings
    const result: Record<string, unknown> = {};

    // Map Gemini Type enum to JSON Schema type string
    if (schema.type) {
      const typeStr = String(schema.type).toLowerCase();
      // Handle special cases
      if (typeStr === 'integer') {
        result['type'] = 'integer';
      } else if (typeStr === 'number') {
        result['type'] = 'number';
      } else if (typeStr === 'string') {
        result['type'] = 'string';
      } else if (typeStr === 'boolean') {
        result['type'] = 'boolean';
      } else if (typeStr === 'array') {
        result['type'] = 'array';
      } else if (typeStr === 'object') {
        result['type'] = 'object';
      } else {
        // Fallback for unknown types
        result['type'] = typeStr;
      }
    }

    // Copy description if present
    if (schema.description) {
      result['description'] = schema.description;
    }

    // Copy enum if present
    if (schema.enum) {
      result['enum'] = schema.enum;
    }

    // Recursively convert properties for object types
    if (schema.properties) {
      const convertedProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        convertedProperties[key] = this.convertSchemaToOpenAI(value);
      }
      result['properties'] = convertedProperties;
    }

    // Handle required fields
    if (schema.required) {
      result['required'] = schema.required;
    }

    if (schema.items) {
      result['items'] = this.convertSchemaToOpenAI(schema.items);
    }

    // Copy nullable if present
    if (schema.nullable !== undefined) {
      result['nullable'] = schema.nullable;
    }

    // Copy format if present
    if (schema.format) {
      result['format'] = schema.format;
    }

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertContentsToOpenAIMessages(contents: Content[]): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    // We need to track the last tool call ID we generated for a given function name
    // to map the response back. This is a heuristic because Gemini doesn't store IDs.
    // We assume responses come in order or we match by name.
    // Better heuristic: stack of IDs per function name.
    const toolCallIdStack: Record<string, string[]> = {};

    for (const content of contents) {
      const role =
        content.role === 'model'
          ? 'assistant'
          : content.role === 'system'
            ? 'system'
            : 'user';

      if (content.parts?.some((p) => p.functionResponse)) {
        // This is a function response. OpenAI expects role: 'tool'
        for (const part of content.parts) {
          if (part.functionResponse) {
            const name = part.functionResponse.name;
            if (name) {
              const ids = toolCallIdStack[name];
              const id = ids?.shift() || `call_unknown_${Date.now()}`; // Fallback if lost state
              messages.push({
                role: 'tool',
                tool_call_id: id,
                content: JSON.stringify(part.functionResponse.response),
              });
            }
          }
        }
        continue; // Skip standard processing for this content block if it was purely function responses
        // Note: Gemini allows mixed text and functionResponse? Usually separated.
      }

      if (content.parts?.some((p) => p.functionCall)) {
        // This is a model message with function calls options
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolCalls: any[] = [];
        let textContent = '';

        for (const part of content.parts) {
          if (part.text) {
            textContent += part.text;
          }
          if (part.functionCall) {
            const name = part.functionCall.name;
            if (name) {
              const id = `call_${name}_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`;
              if (!toolCallIdStack[name]) toolCallIdStack[name] = [];
              toolCallIdStack[name].push(id);

              toolCalls.push({
                id,
                type: 'function',
                function: {
                  name,
                  arguments: JSON.stringify(part.functionCall.args),
                },
              });
            }
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message: any = { role };
        if (textContent) message.content = textContent;
        if (toolCalls.length > 0) message.tool_calls = toolCalls;
        messages.push(message);
        continue;
      }

      // Standard text message
      const textParts = (content.parts || [])
        .filter((p) => p.text)
        .map((p) => p.text)
        .join('');

      messages.push({
        role,
        content: textParts,
      });
    }

    return messages;
  }

  private convertOpenAIResponseToGemini(
    data: OpenAIResponse,
  ): GenerateContentResponse {
    const choice = data.choices?.[0];
    const message = choice?.message;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    if (message?.content) {
      parts.push({ text: message.content });
    }

    if (message?.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          let args = {};
          try {
            args = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            if (this.globalConfig.getDebugMode()) {
              console.error(
                '[OpenAI Provider] Failed to parse function arguments:',
                e,
              );
            }
          }
          parts.push({
            functionCall: {
              name: toolCall.function.name || '',
              args,
            },
          });
        }
      }
    }

    const candidate: Candidate = {
      content: {
        role: 'model',
        parts,
      },
      finishReason: (choice?.finish_reason?.toUpperCase() ||
        'STOP') as FinishReason,
    };

    const response = new GenerateContentResponse();
    response.candidates = [candidate];

    return response;
  }
}
