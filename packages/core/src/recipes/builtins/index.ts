/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Recipe } from '../schema.js';

export const builtinRecipes: Recipe[] = [
  {
    id: 'workspace-overview',
    version: '1.0.0',
    title: 'Workspace overview',
    goal: 'Get a fast snapshot of the repository by reading the main docs.',
    steps: [
      {
        id: 'read-readme',
        title: 'Read README',
        description: 'Review the top-level README for quick context.',
        toolCall: {
          name: 'read_file',
          args: { file_path: 'README.md' },
        },
      },
      {
        id: 'read-openquestions',
        title: 'Read open questions',
        description: 'Load the finalized architectural decisions.',
        toolCall: {
          name: 'read_file',
          args: { file_path: 'openquestions.md' },
        },
      },
    ],
  },
  {
    id: 'professionalization-plan',
    version: '1.0.0',
    title: 'Professionalization plan review',
    goal: 'Pull the current professionalization plan and risks.',
    steps: [
      {
        id: 'review-task-checklist',
        title: 'Review TASK_CHECKLIST',
        toolCall: {
          name: 'read_file',
          args: { file_path: 'TASK_CHECKLIST.md' },
        },
      },
      {
        id: 'review-risk',
        title: 'Review RISK_ASSESSMENT',
        toolCall: {
          name: 'read_file',
          args: { file_path: 'RISK_ASSESSMENT.md' },
        },
      },
    ],
  },
  {
    id: 'spec-dive',
    version: '1.0.0',
    title: 'Spec deep dive',
    goal: 'Open the technical spec for quick navigation.',
    steps: [
      {
        id: 'read-spec',
        title: 'Read TECHNICAL_SPEC',
        toolCall: {
          name: 'read_file',
          args: { file_path: 'TECHNICAL_SPEC.md' },
        },
      },
    ],
  },
  {
    id: 'checkpoint-audit',
    version: '1.0.0',
    title: 'Audit context',
    goal: 'Pull the current audit design and schema context.',
    steps: [
      {
        id: 'audit-schema',
        title: 'Read audit schema',
        toolCall: {
          name: 'read_file',
          args: { file_path: 'packages/core/src/audit/schema.ts' },
        },
      },
      {
        id: 'audit-spec',
        title: 'Read audit section',
        toolCall: {
          name: 'read_file',
          args: { file_path: 'TECHNICAL_SPEC.md' },
        },
      },
    ],
  },
  {
    id: 'checklist-reminder',
    version: '1.0.0',
    title: 'Checklist reminder',
    goal: 'Quickly reopen the task checklist for inline reference.',
    steps: [
      {
        id: 'task-checklist',
        title: 'Read task checklist',
        toolCall: {
          name: 'read_file',
          args: { file_path: 'TASK_CHECKLIST.md' },
        },
      },
    ],
  },
];
