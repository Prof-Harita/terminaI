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
    arguments?: unknown; // Can be partial in stream delta; typically a JSON string
  };
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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
  // Maps sanitized OpenAI tool names back to original Gemini names
  // e.g., "ui_click" → "ui.click"
  private toolNameMap: Map<string, string> = new Map();

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

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getParametersJsonSchema(fn: unknown): Record<string, unknown> | null {
    if (!this.isPlainObject(fn)) {
      return null;
    }
    const parametersJsonSchema = fn['parametersJsonSchema'];
    return this.isPlainObject(parametersJsonSchema)
      ? parametersJsonSchema
      : null;
  }

  private parseToolArguments(value: unknown): Record<string, unknown> | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = JSON.parse(trimmed) as unknown;
      return this.isPlainObject(parsed) ? parsed : {};
    }
    return this.isPlainObject(value) ? value : null;
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
        'The OpenAI provider currently only supports text. To use images or other files, please switch to the Gemini provider.',
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
    if (request.config?.topP !== undefined) {
      body['top_p'] = request.config.topP;
    }
    if (request.config?.presencePenalty !== undefined) {
      body['presence_penalty'] = request.config.presencePenalty;
    }
    if (request.config?.frequencyPenalty !== undefined) {
      body['frequency_penalty'] = request.config.frequencyPenalty;
    }
    if (request.config?.seed !== undefined) {
      body['seed'] = request.config.seed;
    }
    if (request.config?.stopSequences) {
      body['stop'] = request.config.stopSequences;
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
        'The OpenAI provider currently only supports text. To use images or other files, please switch to the Gemini provider.',
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
    if (request.config?.topP !== undefined) body['top_p'] = request.config.topP;
    if (request.config?.presencePenalty !== undefined)
      body['presence_penalty'] = request.config.presencePenalty;
    if (request.config?.frequencyPenalty !== undefined)
      body['frequency_penalty'] = request.config.frequencyPenalty;
    if (request.config?.seed !== undefined) body['seed'] = request.config.seed;
    if (request.config?.stopSequences)
      body['stop'] = request.config.stopSequences;

    // Request usage implementation for streaming
    body['stream_options'] = { include_usage: true };

    const response = await this.fetchOpenAI(
      '/chat/completions',
      body,
      request.config?.abortSignal,
    );

    if (!response.body) {
      throw new Error('No response body from OpenAI stream');
    }

    const debugMode = this.globalConfig.getDebugMode();
    const toolNameMap = this.toolNameMap;
    const parseToolArguments = (value: unknown) =>
      this.parseToolArguments(value);

    return (async function* () {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasYieldedAnyText = false;

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
                const data = JSON.parse(trimmed.slice(6)) as OpenAIResponse;
                const choice = data.choices?.[0];
                const delta = choice?.delta;
                const message = choice?.message;
                const finishReason = choice?.finish_reason?.toUpperCase();

                // 1. Handle Text Content
                if (delta?.content) {
                  hasYieldedAnyText = true;
                  const resp = new GenerateContentResponse();
                  resp.candidates = [
                    {
                      content: {
                        role: 'model',
                        parts: [{ text: delta.content }],
                      },
                    },
                  ];
                  yield resp;
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
                          arguments:
                            typeof tc.function?.arguments === 'string'
                              ? tc.function.arguments
                              : '',
                        },
                      };
                    } else {
                      if (tc.id && !pendingToolCalls[index].id) {
                        pendingToolCalls[index].id = tc.id;
                      }
                      if (tc.function?.arguments) {
                        if (typeof tc.function.arguments === 'string') {
                          pendingToolCalls[index].function.arguments +=
                            tc.function.arguments;
                        }
                      }
                      if (tc.function?.name) {
                        pendingToolCalls[index].function.name +=
                          tc.function.name;
                      }
                    }
                  }
                }

                // 3. Handle Usage Metadata (streaming)
                if (data.usage) {
                  const usage = data.usage;
                  const resp = new GenerateContentResponse();
                  resp.usageMetadata = {
                    promptTokenCount: usage.prompt_tokens,
                    candidatesTokenCount: usage.completion_tokens,
                    totalTokenCount: usage.total_tokens,
                  };
                  // If usage comes in a separate chunk without content, we must yield it
                  // Often it's the last chunk.
                  yield resp;
                }

                // 4. Handle Finish
                if (finishReason) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const parts: any[] = [];

                  if (
                    !hasYieldedAnyText &&
                    typeof message?.content === 'string'
                  ) {
                    parts.push({ text: message.content });
                  }

                  let hasEmittedToolCall = false;
                  // If we have buffered tool calls, finalize them now
                  const toolIndices = Object.keys(pendingToolCalls)
                    .map(Number)
                    .sort((a, b) => a - b);
                  for (const index of toolIndices) {
                    const tc = pendingToolCalls[index];
                    try {
                      const parsedArgs = parseToolArguments(
                        tc.function.arguments,
                      );
                      const args = parsedArgs ?? {};
                      // Unsanitize tool name back to original Gemini format
                      const originalName =
                        toolNameMap.get(tc.function.name) || tc.function.name;
                      parts.push({
                        functionCall: {
                          ...(tc.id ? { id: tc.id } : {}),
                          name: originalName,
                          args,
                        },
                      });
                      hasEmittedToolCall = true;
                    } catch (e) {
                      if (debugMode) {
                        console.error(
                          '[OpenAI Provider] Failed to parse streamed arguments:',
                          e,
                        );
                      }
                    }
                  }

                  if (!hasEmittedToolCall && message?.tool_calls) {
                    for (const tc of message.tool_calls) {
                      try {
                        const parsedArgs = parseToolArguments(
                          tc.function.arguments,
                        );
                        const args = parsedArgs ?? {};
                        parts.push({
                          functionCall: {
                            ...(tc.id ? { id: tc.id } : {}),
                            name:
                              toolNameMap.get(tc.function.name || '') ||
                              tc.function.name ||
                              '',
                            args,
                          },
                        });
                      } catch (e) {
                        if (debugMode) {
                          console.error(
                            '[OpenAI Provider] Failed to parse message tool arguments:',
                            e,
                          );
                        }
                      }
                    }
                  }

                  const resp = new GenerateContentResponse();
                  resp.candidates = [
                    {
                      content: {
                        role: 'model',
                        parts,
                      },
                      finishReason: finishReason as FinishReason,
                    },
                  ];
                  yield resp;
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
    const baseUrl = this.config.baseUrl.trim();
    if (baseUrl.length === 0) {
      throw new Error(
        'OpenAI-compatible baseUrl is missing. Set llm.openaiCompatible.baseUrl (or run /auth wizard) and try again.',
      );
    }
    if (!/^https?:\/\//i.test(baseUrl)) {
      throw new Error(
        `OpenAI-compatible baseUrl must start with http:// or https:// (got "${this.config.baseUrl}").`,
      );
    }

    const url = `${baseUrl.replace(/\/+$/, '')}${endpoint}`;
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

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const response = await fetch(url, options);

        if (response.ok) {
          return response;
        }

        // Check for retryable errors (429, 503)
        if (
          attempt < 3 &&
          (response.status === 429 || response.status >= 500)
        ) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          if (this.globalConfig.getDebugMode()) {
            console.warn(
              `[OpenAI] Request failed with ${response.status}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/3)`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        const text = await response.text().catch(() => '');
        throw new Error(
          `OpenAI compatible backend error (${response.status}): ${text}`,
        );
      } catch (error: unknown) {
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          if (this.globalConfig.getDebugMode()) {
            console.warn(
              `[OpenAI] Network error. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/3)`,
              error,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }

  private convertTools(tools: Tool[]): OpenAITool[] {
    const openAITools: OpenAITool[] = [];
    for (const tool of tools) {
      if (tool.functionDeclarations) {
        for (const fn of tool.functionDeclarations) {
          const parametersFromJsonSchema = this.getParametersJsonSchema(fn);
          openAITools.push({
            type: 'function',
            function: {
              name: this.sanitizeToolName(fn.name || 'unknown_tool'),
              description: fn.description,
              parameters:
                parametersFromJsonSchema ??
                (fn.parameters
                  ? this.convertSchemaToOpenAI(fn.parameters)
                  : undefined),
            },
          });
        }
      }
    }
    return openAITools;
  }

  /**
   * Sanitizes tool names for OpenAI function calling compatibility.
   * OpenAI spec only allows: ^[a-zA-Z0-9_-]+$ (no dots, must not start with number)
   * This converts names like "ui.click" → "ui_click" at the adapter level,
   * keeping Gemini tool names unchanged in the core codebase.
   * Records the mapping so we can reverse it when parsing model responses.
   */
  private sanitizeToolName(name: string): string {
    // Replace dots and other invalid characters with underscores
    let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    // Ensure name doesn't start with a number
    if (/^[0-9]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    // Record mapping for reverse lookup
    if (sanitized !== name) {
      this.toolNameMap.set(sanitized, name);
    }
    return sanitized;
  }

  /**
   * Reverses tool name sanitization to get original Gemini name.
   */
  private unsanitizeToolName(sanitizedName: string): string {
    return this.toolNameMap.get(sanitizedName) || sanitizedName;
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
              const id =
                part.functionCall.id ||
                `call_${name}_${Date.now()}_${Math.random()
                  .toString(36)
                  .slice(2, 7)}`;
              if (!toolCallIdStack[name]) toolCallIdStack[name] = [];
              toolCallIdStack[name].push(id);

              toolCalls.push({
                id,
                type: 'function',
                function: {
                  name: this.sanitizeToolName(name),
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
        .map((p) => {
          if ('thought' in p && p.thought) {
            return `[Thought: ${p.thought}]\n`;
          }
          if ('text' in p && p.text) {
            return p.text;
          }
          return '';
        })
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
          try {
            const parsedArgs = this.parseToolArguments(
              toolCall.function.arguments,
            );
            const args = parsedArgs ?? {};
            parts.push({
              functionCall: {
                id: toolCall.id,
                name: this.unsanitizeToolName(toolCall.function.name || ''),
                args,
              },
            });
          } catch (e) {
            if (this.globalConfig.getDebugMode()) {
              console.error(
                '[OpenAI Provider] Failed to parse function arguments:',
                e,
              );
            }
            parts.push({
              functionCall: {
                id: toolCall.id,
                name: this.unsanitizeToolName(toolCall.function.name || ''),
                args: {},
              },
            });
          }
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

    if (data.usage) {
      response.usageMetadata = {
        promptTokenCount: data.usage.prompt_tokens,
        candidatesTokenCount: data.usage.completion_tokens,
        totalTokenCount: data.usage.total_tokens,
      };
    }

    return response;
  }
}
