/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Intention } from './types.js';

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function classifyIntention(
  toolCall: ToolCall,
  conversationHistory: Message[],
): Intention {
  const lastUserMessage = conversationHistory
    .slice()
    .reverse()
    .find((m) => m.role === 'user');

  if (!lastUserMessage) {
    return 'autonomous';
  }

  const userRequest = lastUserMessage.content.toLowerCase();
  const toolName = toolCall.name.toLowerCase();
  const toolArgs = JSON.stringify(toolCall.args).toLowerCase();

  // Check if user explicitly mentioned the target
  // e.g., "delete the temp folder" → rm ./temp
  if (directlyMentioned(userRequest, toolArgs)) {
    return 'explicit';
  }

  // Check if it's necessary for the stated goal
  // e.g., "clean up project" → rm node_modules
  if (requiredForGoal(userRequest, toolName, toolArgs)) {
    return 'task-derived';
  }

  return 'autonomous';
}

function directlyMentioned(userRequest: string, toolArgs: string): boolean {
  // Extract simple path-like segments or keywords from args
  // This is a naive heuristic.
  // We look for segments > 3 chars that appear in user request.
  // Exclude common json chars.
  const cleanArgs = toolArgs.replace(/[{}":,[\]]/g, ' ');
  return cleanArgs
    .split(/\s+/)
    .some((part) => part.length > 3 && userRequest.includes(part));
}

function requiredForGoal(
  userRequest: string,
  toolName: string,
  toolArgs: string,
): boolean {
  // Common patterns linking intents to tools/args
  const patterns = [
    {
      goal: /clean\s*up/,
      allows: ['delete', 'node_modules', 'cache', 'temp', 'dist'],
    },
    {
      goal: /install|add dependency/,
      allows: ['npm', 'pip', 'cargo', 'install', 'add'],
    },
    { goal: /deploy/, allows: ['build', 'push', 'upload', 'deploy'] },
    { goal: /test/, allows: ['npm test', 'jest', 'vitest', 'pytest'] },
    { goal: /lint|format/, allows: ['eslint', 'prettier', 'lint'] },
  ];

  for (const { goal, allows } of patterns) {
    if (goal.test(userRequest)) {
      if (
        allows.some(
          (keyword) => toolName.includes(keyword) || toolArgs.includes(keyword),
        )
      ) {
        return true;
      }
    }
  }

  return false;
}
