/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { RecipeLoader } from './loader.js';
import { Storage } from '../config/storage.js';
import type { Config } from '../config/config.js';

function createConfigStub(
  targetDir: string,
  settings?: Record<string, unknown>,
): Config {
  return {
    storage: new Storage(targetDir),
    getTargetDir: () => targetDir,
    getRecipeSettings: () => settings ?? {},
  } as unknown as Config;
}

async function writeTempRecipe(
  dir: string,
  id = 'community-recipe',
): Promise<string> {
  const recipePath = path.join(dir, `${id}.yaml`);
  const content = [
    `id: ${id}`,
    'version: 1.0.0',
    'title: Community recipe',
    'goal: Test recipe loading',
    'steps:',
    '  - id: step-1',
    '    title: Read file',
    '    toolCall:',
    '      name: read_file',
    '      args:',
    '        file_path: README.md',
    '',
  ].join('\n');
  await fs.writeFile(recipePath, content, 'utf-8');
  return recipePath;
}

describe('RecipeLoader', () => {
  const tempRoot = path.join(os.tmpdir(), 'recipes-loader-tests');

  beforeEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
    await fs.mkdir(tempRoot, { recursive: true });
  });

  it('includes built-in recipes', async () => {
    const loader = new RecipeLoader(createConfigStub(tempRoot));
    const recipes = await loader.listRecipes();
    expect(recipes.some((r) => r.origin === 'builtin')).toBe(true);
  });

  it('marks community recipes as requiring confirmation', async () => {
    const communityDir = await fs.mkdtemp(
      path.join(tempRoot, 'community-untrusted-'),
    );
    await writeTempRecipe(communityDir, 'needs-confirm');
    const trustStore = path.join(tempRoot, 'trust-community.json');

    const loader = new RecipeLoader(createConfigStub(tempRoot), {
      allowCommunity: true,
      communityPaths: [communityDir],
      userPaths: [],
      trustStorePath: trustStore,
    });

    const recipes = await loader.listRecipes();
    const community = recipes.find((r) => r.origin === 'community');
    expect(community?.requiresConfirmation).toBe(true);
  });

  it('persists trust once community recipe is confirmed', async () => {
    const communityDir = await fs.mkdtemp(
      path.join(tempRoot, 'community-trusted-'),
    );
    await writeTempRecipe(communityDir, 'trusted-demo');
    const trustStore = path.join(tempRoot, 'trust-community.json');
    const confirmFn = vi.fn().mockResolvedValue(true);

    const loader = new RecipeLoader(createConfigStub(tempRoot), {
      allowCommunity: true,
      communityPaths: [communityDir],
      userPaths: [],
      trustStorePath: trustStore,
      confirmCommunityRecipe: confirmFn,
    });

    const recipes = await loader.listRecipes();
    const community = recipes.find((r) => r.origin === 'community');
    expect(confirmFn).toHaveBeenCalled();
    expect(community?.requiresConfirmation).toBe(false);

    const stored = JSON.parse(await fs.readFile(trustStore, 'utf-8'));
    expect(stored).toContain('trusted-demo');
  });
});
