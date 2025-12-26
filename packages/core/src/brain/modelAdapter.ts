/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GeminiClient } from '../core/client.js';
import type { GenerativeModelAdapter } from './riskAssessor.js';
import type { Config } from '../config/config.js';
import {
  resolveClassifierModel,
  GEMINI_MODEL_ALIAS_FLASH,
} from '../config/models.js';

/**
 * Adapter that bridges the cognitive architecture's GenerativeModelAdapter
 * with the GeminiClient, supporting model tiering (Flash vs Pro).
 */
export class BrainModelAdapter implements GenerativeModelAdapter {
  constructor(
    private readonly client: GeminiClient,
    private readonly config: Config,
  ) {}

  async generateContent(
    prompt: string,
    options?: { abortSignal?: AbortSignal; tier?: 'flash' | 'pro' },
  ): Promise<{ response: { text: () => string } }> {
    const requestedModel = this.config.getModel();
    const previewEnabled = this.config.getPreviewFeatures();

    let modelToUse = requestedModel;
    if (options?.tier === 'flash') {
      modelToUse = resolveClassifierModel(
        requestedModel,
        GEMINI_MODEL_ALIAS_FLASH,
        previewEnabled,
      );
    }

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const modelConfigKey = { model: modelToUse };

    // We use the client's generateContent which handles retries and auth
    const response = await this.client.generateContent(
      modelConfigKey,
      contents,
      options?.abortSignal || new AbortController().signal,
    );

    return {
      response: {
        text: () => {
          const part = response.candidates?.[0]?.content?.parts?.[0];
          if (part && 'text' in part) {
            return (part as { text: string }).text;
          }
          return '';
        },
      },
    };
  }
}
