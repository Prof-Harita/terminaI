/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import {
  CoreToolScheduler,
  type CompletedToolCall,
  type Config,
  type ToolCallRequestInfo,
} from '../index.js';
import type { LoadedRecipe, Recipe } from './schema.js';
import type { AuditReviewLevel } from '../audit/schema.js';

export interface RecipeExecutionResult {
  stepId: string;
  success: boolean;
  error?: string;
  toolCallId: string;
}

export interface RecipeExecutorOptions {
  schedulerFactory?: (
    config: Config,
    signal: AbortSignal,
    onComplete: (calls: CompletedToolCall[]) => void,
  ) => CoreToolScheduler;
}

function toRequest(
  recipe: Recipe,
  step: Recipe['steps'][number],
): ToolCallRequestInfo {
  if (!step.toolCall) {
    throw new Error(
      `Recipe "${recipe.id}" step "${step.id}" is missing toolCall payload.`,
    );
  }
  const reviewLevel: AuditReviewLevel | undefined = step.escalatesReviewTo;
  return {
    callId: `${recipe.id}-${step.id}-${randomUUID()}`,
    name: step.toolCall.name,
    args: step.toolCall.args ?? {},
    isClientInitiated: true,
    prompt_id: recipe.id,
    provenance: ['local_user'],
    requestedReviewLevel: reviewLevel,
    recipe: {
      id: recipe.id,
      version: recipe.version,
      stepId: step.id,
    },
  };
}

export class RecipeExecutor {
  private readonly schedulerFactory?: RecipeExecutorOptions['schedulerFactory'];

  constructor(
    private readonly config: Config,
    options?: RecipeExecutorOptions,
  ) {
    this.schedulerFactory = options?.schedulerFactory;
  }

  async run(
    loadedRecipe: LoadedRecipe,
    abortSignal: AbortSignal,
  ): Promise<RecipeExecutionResult[]> {
    const { recipe, origin, requiresConfirmation } = loadedRecipe;
    if (origin === 'community' && requiresConfirmation) {
      throw new Error(
        `Recipe "${recipe.id}" requires confirmation before execution.`,
      );
    }

    const requests = recipe.steps.map((step) => toRequest(recipe, step));
    const completed: CompletedToolCall[] = [];
    const handleCompletion = (calls: CompletedToolCall[]) => {
      completed.push(...calls);
    };

    const scheduler =
      this.schedulerFactory?.(this.config, abortSignal, handleCompletion) ??
      new CoreToolScheduler({
        config: this.config,
        getPreferredEditor: () => undefined,
        onAllToolCallsComplete: async (calls) => {
          handleCompletion(calls);
        },
      });

    await scheduler.schedule(requests, abortSignal);

    // Wait for completion if onAllToolCallsComplete hasn't fired yet
    if (completed.length !== requests.length) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Recipe execution timed out.')),
          30_000,
        );
        const checkInterval = setInterval(() => {
          if (completed.length === requests.length) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 25);
        abortSignal.addEventListener(
          'abort',
          () => {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            reject(new Error('Recipe execution aborted.'));
          },
          { once: true },
        );
      });
    }

    return completed.map((call) => ({
      stepId:
        call.request.recipe?.stepId ??
        requests.find((req) => req.callId === call.request.callId)?.recipe
          ?.stepId ??
        call.request.callId,
      success: call.status === 'success',
      error:
        call.status === 'error'
          ? (call.response.error?.message ?? 'Unknown error')
          : undefined,
      toolCallId: call.request.callId,
    }));
  }
}
