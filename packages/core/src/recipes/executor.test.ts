/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { RecipeExecutor } from './executor.js';
import type { LoadedRecipe } from './schema.js';
import type { Config } from '../config/config.js';
import type { CompletedToolCall } from '../core/coreToolScheduler.js';

function createRecipe(): LoadedRecipe {
  return {
    origin: 'user',
    recipe: {
      id: 'demo',
      version: '1.0.0',
      title: 'Demo recipe',
      goal: 'Run a simple tool',
      steps: [
        {
          id: 'step-1',
          title: 'Echo',
          toolCall: {
            name: 'run_terminal_command',
            args: { command: 'echo demo' },
          },
        },
      ],
    },
  };
}

describe('RecipeExecutor', () => {
  const configStub = {
    isInteractive: () => true,
  } as unknown as Config;

  it('fails if a community recipe requires confirmation', async () => {
    const executor = new RecipeExecutor(configStub);
    const recipe: LoadedRecipe = {
      ...createRecipe(),
      origin: 'community',
      requiresConfirmation: true,
    };
    await expect(
      executor.run(recipe, new AbortController().signal),
    ).rejects.toThrow(/requires confirmation/);
  });

  it('passes recipe metadata to scheduled tool calls', async () => {
    const scheduled: CompletedToolCall[] = [
      {
        status: 'success',
        request: {
          callId: 'demo-step-1',
          name: 'run_terminal_command',
          args: { command: 'echo demo' },
          prompt_id: 'demo',
          isClientInitiated: true,
          recipe: {
            id: 'demo',
            version: '1.0.0',
            stepId: 'step-1',
          },
        },
        tool: {} as any,
        invocation: {} as any,
        response: {
          callId: 'demo-step-1',
          responseParts: [],
          resultDisplay: undefined,
          error: undefined,
          errorType: undefined,
        },
      },
    ];

    const schedulerFactory = vi
      .fn()
      .mockImplementation(
        (
          _config: Config,
          _signal: AbortSignal,
          onComplete: (calls: CompletedToolCall[]) => void,
        ) => ({
          schedule: vi.fn().mockImplementation(async () => {
            onComplete(scheduled);
          }),
        }),
      );

    const executor = new RecipeExecutor(configStub, { schedulerFactory });
    const result = await executor.run(
      createRecipe(),
      new AbortController().signal,
    );

    expect(schedulerFactory).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].stepId).toBe('step-1');
  });
});
