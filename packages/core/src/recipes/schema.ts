/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AuditReviewLevel } from '../audit/schema.js';

export type RecipeReviewLevel = AuditReviewLevel;

export interface RecipeToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface RecipeStep {
  id: string;
  title: string;
  description?: string;
  toolCall?: RecipeToolCall;
  verify?: { toolCall: RecipeToolCall };
  rollback?: { toolCall: RecipeToolCall };
  /**
   * Optional review level floor. May only raise the effective review level,
   * never lower it.
   */
  escalatesReviewTo?: RecipeReviewLevel;
}

export interface Recipe {
  id: string;
  version: string;
  title: string;
  goal: string;
  steps: RecipeStep[];
}

export type RecipeOrigin = 'builtin' | 'user' | 'community';

export interface LoadedRecipe {
  recipe: Recipe;
  origin: RecipeOrigin;
  path?: string;
  requiresConfirmation?: boolean;
}
