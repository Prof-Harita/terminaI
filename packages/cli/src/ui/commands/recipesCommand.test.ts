/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { recipesCommand } from './recipesCommand.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { MessageType } from '../types.js';
import type {
  LoadedRecipe,
  RecipeExecutor,
  RecipeLoader,
} from '@terminai/core';

function createRecipe(id: string): LoadedRecipe {
  return {
    origin: 'user',
    recipe: {
      id,
      version: '1.0.0',
      title: 'Sample',
      goal: 'Demo',
      steps: [
        {
          id: 'step-1',
          title: 'Read',
          toolCall: { name: 'read_file', args: { file_path: 'README.md' } },
        },
      ],
    },
  };
}

describe('recipesCommand', () => {
  it('lists recipes', async () => {
    const loader: RecipeLoader = {
      listRecipes: vi.fn().mockResolvedValue([createRecipe('demo')]),
      getRecipe: vi.fn(),
      markCommunityRecipeTrusted: vi.fn(),
    } as unknown as RecipeLoader;
    const cmd = recipesCommand({
      loaderFactory: () => loader,
      executorFactory: vi.fn(),
    });
    const ctx = createMockCommandContext({
      services: { config: {} as any },
    });
    if (!cmd.action) throw new Error('missing action');
    await cmd.action(ctx, 'list');
    expect(ctx.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.INFO }),
      expect.any(Number),
    );
  });

  it('requires confirmation for community recipes', async () => {
    const recipe = createRecipe('community');
    recipe.origin = 'community';
    recipe.requiresConfirmation = true;
    const loader: RecipeLoader = {
      listRecipes: vi.fn(),
      getRecipe: vi.fn().mockResolvedValue(recipe),
      markCommunityRecipeTrusted: vi.fn(),
    } as unknown as RecipeLoader;
    const cmd = recipesCommand({
      loaderFactory: () => loader,
      executorFactory: vi.fn(),
    });
    const ctx = createMockCommandContext({
      services: { config: {} as any },
    });
    const run = cmd.subCommands?.find((c) => c.name === 'run');
    if (!run || !run.action) throw new Error('missing run action');
    await run.action(ctx, 'run community');
    expect(ctx.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.ERROR,
        text: expect.stringContaining('requires confirmation'),
      }),
      expect.any(Number),
    );
  });

  it('runs recipe after confirmation', async () => {
    const recipe = createRecipe('confirmed');
    recipe.origin = 'community';
    recipe.requiresConfirmation = true;

    const loader: RecipeLoader = {
      listRecipes: vi.fn(),
      getRecipe: vi.fn().mockResolvedValue(recipe),
      markCommunityRecipeTrusted: vi.fn(),
    } as unknown as RecipeLoader;
    const executor: RecipeExecutor = {
      run: vi.fn().mockResolvedValue([
        { stepId: 'step-1', success: true, toolCallId: 'id-1' },
      ]),
    } as unknown as RecipeExecutor;

    const cmd = recipesCommand({
      loaderFactory: () => loader,
      executorFactory: () => executor,
    });
    const ctx = createMockCommandContext({
      services: { config: {} as any },
    });
    const run = cmd.subCommands?.find((c) => c.name === 'run');
    if (!run || !run.action) throw new Error('missing run action');
    await run.action(ctx, 'run confirmed --confirm');
    expect(loader.markCommunityRecipeTrusted).toHaveBeenCalledWith('confirmed');
    expect(executor.run).toHaveBeenCalled();
    expect(ctx.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ type: MessageType.INFO }),
      expect.any(Number),
    );
  });
});
