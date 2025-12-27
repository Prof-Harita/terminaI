/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { builtinRecipes } from './builtins/index.js';
import {
  type LoadedRecipe,
  type Recipe,
  type RecipeOrigin,
} from './schema.js';
import type { Config } from '../config/config.js';
import { Storage } from '../config/storage.js';
import { debugLogger } from '../utils/debugLogger.js';

async function parseYaml(): Promise<(text: string) => unknown> {
  const yamlModule = await import('yaml');
  return yamlModule.parse;
}

async function parseRecipeFile(filePath: string): Promise<Recipe> {
  const content = await fs.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let parsed: unknown;
  if (ext === '.json') {
    parsed = JSON.parse(content);
  } else if (ext === '.yaml' || ext === '.yml') {
    const parse = await parseYaml();
    parsed = parse(content);
  } else {
    throw new Error(`Unsupported recipe file format: ${ext}`);
  }

  return validateRecipe(parsed, filePath);
}

function validateRecipe(candidate: unknown, source?: string): Recipe {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`Invalid recipe${source ? ` from ${source}` : ''}`);
  }
  const recipe = candidate as Recipe;
  if (
    !recipe.id ||
    !recipe.version ||
    !recipe.title ||
    !recipe.goal ||
    !Array.isArray(recipe.steps)
  ) {
    throw new Error(`Recipe missing required fields${source ? `: ${source}` : ''}`);
  }
  for (const step of recipe.steps) {
    if (!step.id || !step.title) {
      throw new Error(
        `Recipe step missing id or title${source ? `: ${source}` : ''}`,
      );
    }
  }
  return recipe;
}

export interface RecipeLoaderOptions {
  userPaths: string[];
  communityPaths: string[];
  allowCommunity: boolean;
  confirmCommunityOnFirstLoad: boolean;
  trustedCommunityRecipeIds: string[];
  trustStorePath: string;
  confirmCommunityRecipe?: (recipe: Recipe, filePath: string) => Promise<boolean>;
}

async function readTrustStore(trustStorePath: string): Promise<Set<string>> {
  try {
    const content = await fs.readFile(trustStorePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id) => typeof id === 'string'));
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      debugLogger.warn(
        `Failed to read community recipe trust store: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return new Set<string>();
}

async function writeTrustStore(
  trustStorePath: string,
  trusted: Set<string>,
): Promise<void> {
  await fs.mkdir(path.dirname(trustStorePath), { recursive: true });
  await fs.writeFile(
    trustStorePath,
    JSON.stringify(Array.from(trusted), null, 2),
    'utf-8',
  );
}

export class RecipeLoader {
  private readonly options: RecipeLoaderOptions;
  private trustedCommunityRecipes: Set<string> = new Set();

  constructor(config: Config, overrides?: Partial<RecipeLoaderOptions>) {
    const recipeSettings = config.getRecipeSettings?.() ?? {};
    const storage = config.storage ?? new Storage(config.getTargetDir?.() ?? '.');
    const trustStorePath =
      overrides?.trustStorePath ??
      storage.getCommunityRecipesTrustStorePath();
    this.options = {
      userPaths:
        overrides?.userPaths ??
        recipeSettings.paths ??
        [storage.getProjectRecipesDir()],
      communityPaths:
        overrides?.communityPaths ?? recipeSettings.communityPaths ?? [],
      allowCommunity:
        overrides?.allowCommunity ?? recipeSettings.allowCommunity ?? false,
      confirmCommunityOnFirstLoad:
        overrides?.confirmCommunityOnFirstLoad ??
        recipeSettings.confirmCommunityOnFirstLoad ??
        true,
      trustedCommunityRecipeIds:
        overrides?.trustedCommunityRecipeIds ??
        recipeSettings.trustedCommunityRecipes ??
        [],
      trustStorePath,
      confirmCommunityRecipe:
        overrides?.confirmCommunityRecipe ??
        (recipeSettings.confirmCommunityOnFirstLoad === false
          ? async () => true
          : undefined),
    };
  }

  async initialize(): Promise<void> {
    const persisted = await readTrustStore(this.options.trustStorePath);
    this.trustedCommunityRecipes = new Set([
      ...persisted,
      ...(this.options.trustedCommunityRecipeIds ?? []),
    ]);
  }

  async listRecipes(): Promise<LoadedRecipe[]> {
    if (this.trustedCommunityRecipes.size === 0) {
      await this.initialize();
    }
    const results: LoadedRecipe[] = [];
    results.push(
      ...builtinRecipes.map((recipe) => ({
        recipe,
        origin: 'builtin' as RecipeOrigin,
        path: 'builtin',
      })),
    );

    const userRecipes = await this.loadFromPaths(
      this.options.userPaths,
      'user',
      false,
    );
    results.push(...userRecipes);

    if (this.options.allowCommunity) {
      const communityRecipes = await this.loadFromPaths(
        this.options.communityPaths,
        'community',
        this.options.confirmCommunityOnFirstLoad,
      );
      results.push(...communityRecipes);
    }

    return results;
  }

  async getRecipe(id: string): Promise<LoadedRecipe | undefined> {
    const all = await this.listRecipes();
    return all.find((entry) => entry.recipe.id === id);
  }

  async markCommunityRecipeTrusted(recipeId: string): Promise<void> {
    if (!this.trustedCommunityRecipes.has(recipeId)) {
      this.trustedCommunityRecipes.add(recipeId);
      await writeTrustStore(
        this.options.trustStorePath,
        this.trustedCommunityRecipes,
      );
    }
  }

  private async loadFromPaths(
    paths: string[],
    origin: RecipeOrigin,
    requireConfirmation: boolean,
  ): Promise<LoadedRecipe[]> {
    const results: LoadedRecipe[] = [];
    for (const basePath of paths) {
      if (!basePath) continue;
      let entries: string[] = [];
      try {
        const stats = await fs.stat(basePath);
        if (stats.isFile()) {
          entries = [basePath];
        } else if (stats.isDirectory()) {
          const files = await fs.readdir(basePath);
          entries = files
            .filter((file) =>
              ['.json', '.yaml', '.yml'].includes(path.extname(file)),
            )
            .map((file) => path.join(basePath, file));
        }
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError?.code !== 'ENOENT') {
          debugLogger.warn(
            `Skipping recipe path ${basePath}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        continue;
      }

      for (const file of entries) {
        try {
          const recipe = await parseRecipeFile(file);
          const isTrusted =
            origin !== 'community' ||
            this.trustedCommunityRecipes.has(recipe.id) ||
            !requireConfirmation;

          let requiresConfirmation =
            origin === 'community' && requireConfirmation && !isTrusted;

          if (
            origin === 'community' &&
            requiresConfirmation &&
            this.options.confirmCommunityRecipe
          ) {
            const approved = await this.options.confirmCommunityRecipe(
              recipe,
              file,
            );
            if (approved) {
              requiresConfirmation = false;
              await this.markCommunityRecipeTrusted(recipe.id);
            }
          }

          results.push({
            recipe,
            origin,
            path: file,
            requiresConfirmation,
          });
        } catch (error) {
          debugLogger.warn(
            `Failed to load recipe from ${file}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }
    return results;
  }
}
