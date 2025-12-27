/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Config,
  LoadedRecipe,
  RecipeExecutor,
  RecipeLoader,
} from '@terminai/core';
import { RecipeExecutor as DefaultRecipeExecutor } from '@terminai/core';
import { RecipeLoader as DefaultRecipeLoader } from '@terminai/core';
import { CommandKind, type SlashCommand } from './types.js';
import { MessageType } from '../types.js';

interface RecipesCommandDeps {
  loaderFactory?: (config: Config) => RecipeLoader;
  executorFactory?: (config: Config) => RecipeExecutor;
}

function ensureConfig(
  context: Parameters<NonNullable<SlashCommand['action']>>[0],
): Config | null {
  const config = context.services.config;
  if (!config) {
    context.ui.addItem(
      {
        type: MessageType.ERROR,
        text: 'Configuration is not available.',
      },
      Date.now(),
    );
    return null;
  }
  return config;
}

function formatList(recipes: LoadedRecipe[]): string {
  if (recipes.length === 0) {
    return 'No recipes found.';
  }
  return recipes
    .map((entry) => {
      const { recipe, origin, requiresConfirmation } = entry;
      const originLabel = origin === 'builtin' ? 'built-in' : origin;
      const confirmationNote = requiresConfirmation
        ? ' (requires confirmation)'
        : '';
      return `- ${recipe.id} (${originLabel})${confirmationNote}: ${recipe.title}`;
    })
    .join('\n');
}

function formatRecipe(recipe: LoadedRecipe): string {
  const lines = [
    `${recipe.recipe.title} v${recipe.recipe.version}`,
    recipe.recipe.goal,
    '',
    'Steps:',
  ];
  for (const step of recipe.recipe.steps) {
    lines.push(`- [${step.id}] ${step.title}`);
    if (step.description) {
      lines.push(`  ${step.description}`);
    }
  }
  return lines.join('\n');
}

function parseArgs(args: string): { subcommand: string; rest: string[] } {
  const parts = args
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean);
  const [subcommand = 'list', ...rest] = parts;
  return { subcommand, rest };
}

export function recipesCommand(
  deps?: RecipesCommandDeps,
): SlashCommand {
  const createLoader = (config: Config) =>
    deps?.loaderFactory?.(config) ?? new DefaultRecipeLoader(config);
  const createExecutor = (config: Config) =>
    deps?.executorFactory?.(config) ??
    new DefaultRecipeExecutor(config, undefined);

  const handleList = async (
    context: Parameters<NonNullable<SlashCommand['action']>>[0],
  ) => {
    const config = ensureConfig(context);
    if (!config) return;
    const recipes = await createLoader(config).listRecipes();
    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: formatList(recipes),
      },
      Date.now(),
    );
  };

  const handleShow = async (
    context: Parameters<NonNullable<SlashCommand['action']>>[0],
    recipeId?: string,
  ) => {
    const config = ensureConfig(context);
    if (!config) return;
    if (!recipeId) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Usage: /recipes show <id>',
        },
        Date.now(),
      );
      return;
    }
    const recipe = await createLoader(config).getRecipe(recipeId);
    if (!recipe) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: `Recipe "${recipeId}" not found.`,
        },
        Date.now(),
      );
      return;
    }
    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: formatRecipe(recipe),
      },
      Date.now(),
    );
  };

  const handleRun = async (
    context: Parameters<NonNullable<SlashCommand['action']>>[0],
    recipeId?: string,
    confirm?: boolean,
  ) => {
    const config = ensureConfig(context);
    if (!config) return;
    if (!recipeId) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Usage: /recipes run <id> [--confirm]',
        },
        Date.now(),
      );
      return;
    }
    const loader = createLoader(config);
    const recipe = await loader.getRecipe(recipeId);
    if (!recipe) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: `Recipe "${recipeId}" not found.`,
        },
        Date.now(),
      );
      return;
    }
    if (recipe.origin === 'community' && recipe.requiresConfirmation) {
      if (!confirm) {
        context.ui.addItem(
          {
            type: MessageType.ERROR,
            text:
              'Community recipe requires confirmation. Re-run with --confirm to proceed.',
          },
          Date.now(),
        );
        return;
      }
      await loader.markCommunityRecipeTrusted(recipe.recipe.id);
    }

    const executor = createExecutor(config);
    const abortController = new AbortController();
    try {
      const results = await executor.run(recipe, abortController.signal);
      const failed = results.filter((r) => !r.success);
      const summary =
        failed.length === 0
          ? `Recipe "${recipe.recipe.id}" completed.`
          : `Recipe "${recipe.recipe.id}" completed with ${failed.length} failure(s).`;
      context.ui.addItem(
        { type: MessageType.INFO, text: summary },
        Date.now(),
      );
    } catch (error) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text:
            error instanceof Error
              ? error.message
              : String(error ?? 'unknown error'),
        },
        Date.now(),
      );
    }
  };

  return {
    name: 'recipes',
    description: 'List, show, or run governed recipes.',
    kind: CommandKind.BUILT_IN,
    autoExecute: false,
    action: async (context, args) => {
      const { subcommand, rest } = parseArgs(args);
      if (subcommand === 'list') {
        await handleList(context);
        return;
      }

      if (subcommand === 'show') {
        await handleShow(context, rest[0]);
        return;
      }

      if (subcommand === 'run') {
        const recipeId = rest.find((value) => !value.startsWith('--'));
        const confirm = rest.includes('--confirm') || rest.includes('--yes');
        await handleRun(context, recipeId, confirm);
        return;
      }

      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Usage: /recipes [list|show|run]',
        },
        Date.now(),
      );
    },
    subCommands: [
      {
        name: 'list',
        description: 'List available recipes',
        kind: CommandKind.BUILT_IN,
        autoExecute: true,
        action: (context) => handleList(context),
      },
      {
        name: 'show',
        description: 'Show recipe details',
        kind: CommandKind.BUILT_IN,
        autoExecute: true,
        action: (context, args) => {
          const id = args.split(' ').map((p) => p.trim()).filter(Boolean)[0];
          return handleShow(context, id);
        },
      },
      {
        name: 'run',
        description: 'Run a recipe by id',
        kind: CommandKind.BUILT_IN,
        autoExecute: true,
        action: (context, args) => {
          const parts = args
            .split(' ')
            .map((p) => p.trim())
            .filter(Boolean);
          const id = parts.find((value) => !value.startsWith('--'));
          const confirm =
            parts.includes('--confirm') || parts.includes('--yes');
          return handleRun(context, id, confirm);
        },
      },
    ],
  };
}
