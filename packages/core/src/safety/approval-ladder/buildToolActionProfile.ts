/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import type { ActionProfile, OperationClass, Provenance } from './types.js';
import type { Config } from '../../config/config.js';
import {
  EDIT_TOOL_NAME,
  SMART_EDIT_TOOL_NAME,
  WRITE_FILE_TOOL_NAME,
  FILE_OPS_TOOL_NAME,
  PROCESS_MANAGER_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  REPL_TOOL_NAME,
  UI_ASSERT_TOOL_NAME,
  UI_CAPABILITIES_TOOL_NAME,
  UI_CLICK_TOOL_NAME,
  UI_CLICK_XY_TOOL_NAME,
  UI_DESCRIBE_TOOL_NAME,
  UI_FOCUS_TOOL_NAME,
  UI_HEALTH_TOOL_NAME,
  UI_KEY_TOOL_NAME,
  UI_QUERY_TOOL_NAME,
  UI_SCROLL_TOOL_NAME,
  UI_SNAPSHOT_TOOL_NAME,
  UI_TYPE_TOOL_NAME,
  UI_WAIT_TOOL_NAME,
} from '../../tools/tool-names.js';

type BuildToolActionProfileArgs = {
  toolName: string;
  args: Record<string, unknown>;
  config: Config;
  provenance?: Provenance[];
};

const UI_MUTATING_TOOLS = new Set([
  UI_CLICK_TOOL_NAME,
  UI_TYPE_TOOL_NAME,
  UI_KEY_TOOL_NAME,
  UI_SCROLL_TOOL_NAME,
  UI_FOCUS_TOOL_NAME,
  UI_CLICK_XY_TOOL_NAME,
]);

const UI_READ_TOOLS = new Set([
  UI_HEALTH_TOOL_NAME,
  UI_CAPABILITIES_TOOL_NAME,
  UI_SNAPSHOT_TOOL_NAME,
  UI_QUERY_TOOL_NAME,
  UI_DESCRIBE_TOOL_NAME,
  UI_WAIT_TOOL_NAME,
  UI_ASSERT_TOOL_NAME,
]);

function normalizeProvenance(provenance?: Provenance[]): Provenance[] {
  if (!provenance || provenance.length === 0) {
    return ['unknown'];
  }
  const unique = new Set<Provenance>();
  const merged: Provenance[] = [];
  for (const entry of provenance) {
    if (!unique.has(entry)) {
      unique.add(entry);
      merged.push(entry);
    }
  }
  return merged;
}

function resolveTargetDir(config: Config): string {
  if (typeof config.getTargetDir === 'function') {
    return config.getTargetDir();
  }
  return process.cwd();
}

function isPathWithinRoot(root: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(targetPath));
  return (
    !relative.startsWith(`..${path.sep}`) &&
    relative !== '..' &&
    !path.isAbsolute(relative)
  );
}

function resolveToolPath(config: Config, value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return path.resolve(resolveTargetDir(config), trimmed);
}

function uniquePaths(paths: Array<string | null>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of paths) {
    if (!entry || seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    result.push(entry);
  }
  return result;
}

function isUnboundedDeletePath(
  resolvedPath: string,
  workspaceRoots: readonly string[],
): boolean {
  const normalized = path.resolve(resolvedPath);
  const rootPath = path.parse(normalized).root;
  if (normalized === rootPath) {
    return true;
  }
  if (normalized === os.homedir()) {
    return true;
  }
  return workspaceRoots.some(
    (root) => path.resolve(root) === normalized,
  );
}

export function buildToolActionProfile({
  toolName,
  args,
  config,
  provenance,
}: BuildToolActionProfileArgs): ActionProfile {
  const operations = new Set<OperationClass>();
  const targetDir = resolveTargetDir(config);
  const workspaceContext =
    typeof config.getWorkspaceContext === 'function'
      ? config.getWorkspaceContext()
      : null;
  const workspaceRoots =
    workspaceContext && typeof workspaceContext.getDirectories === 'function'
      ? workspaceContext.getDirectories()
      : [targetDir];
  let parseConfidence: 'high' | 'medium' | 'low' = 'high';
  let hasUnboundedScopeSignals = false;
  let rawSummary = toolName;
  let touchedPaths: string[] = [];

  switch (toolName) {
    case EDIT_TOOL_NAME:
    case SMART_EDIT_TOOL_NAME:
    case WRITE_FILE_TOOL_NAME: {
      operations.add('write');
      const filePath = resolveToolPath(config, args['file_path']);
      touchedPaths = uniquePaths([filePath]);
      if (!filePath) {
        parseConfidence = 'low';
      }
      rawSummary = `${toolName} ${args['file_path'] ?? ''}`.trim();
      break;
    }
    case FILE_OPS_TOOL_NAME: {
      const operation = typeof args['operation'] === 'string'
        ? args['operation']
        : 'unknown';
      rawSummary = `${toolName}:${operation}`;
      switch (operation) {
        case 'delete': {
          operations.add('delete');
          const targetPath = resolveToolPath(config, args['path']);
          touchedPaths = uniquePaths([targetPath]);
          if (targetPath) {
            hasUnboundedScopeSignals = isUnboundedDeletePath(
              targetPath,
              workspaceRoots,
            );
          } else {
            parseConfidence = 'low';
          }
          break;
        }
        case 'move': {
          operations.add('write');
          operations.add('delete');
          const fromPath = resolveToolPath(config, args['from']);
          const toPath = resolveToolPath(config, args['to']);
          touchedPaths = uniquePaths([fromPath, toPath]);
          if (!fromPath || !toPath) {
            parseConfidence = 'low';
          }
          break;
        }
        case 'copy': {
          operations.add('write');
          const fromPath = resolveToolPath(config, args['from']);
          const toPath = resolveToolPath(config, args['to']);
          touchedPaths = uniquePaths([fromPath, toPath]);
          if (!fromPath || !toPath) {
            parseConfidence = 'low';
          }
          break;
        }
        case 'mkdir': {
          operations.add('write');
          const targetPath = resolveToolPath(config, args['path']);
          touchedPaths = uniquePaths([targetPath]);
          if (!targetPath) {
            parseConfidence = 'low';
          }
          break;
        }
        case 'list_tree': {
          operations.add('read');
          const targetPath = resolveToolPath(config, args['path']);
          touchedPaths = uniquePaths([targetPath]);
          if (!targetPath) {
            parseConfidence = 'low';
          }
          break;
        }
        default:
          operations.add('unknown');
          parseConfidence = 'low';
      }
      break;
    }
    case PROCESS_MANAGER_TOOL_NAME: {
      const operation = typeof args['operation'] === 'string'
        ? args['operation']
        : 'unknown';
      const readOperations = new Set(['list', 'status', 'read', 'summarize']);
      if (readOperations.has(operation)) {
        operations.add('read');
      } else if (operation === 'unknown') {
        operations.add('unknown');
        parseConfidence = 'low';
      } else {
        operations.add('process');
      }
      rawSummary = `${toolName}:${operation}`.trim();
      break;
    }
    case WEB_FETCH_TOOL_NAME: {
      operations.add('network');
      rawSummary = `${toolName} ${args['url'] ?? ''}`.trim();
      break;
    }
    case REPL_TOOL_NAME: {
      operations.add('process');
      const language = typeof args['language'] === 'string'
        ? args['language']
        : 'unknown';
      if (language === 'shell') {
        operations.add('unknown');
      }
      const code = typeof args['code'] === 'string' ? args['code'] : '';
      if (code.length > 200 || code.split('\n').length > 3) {
        parseConfidence = 'low';
      }
      rawSummary = `${toolName}:${language}`;
      break;
    }
    default: {
      if (UI_MUTATING_TOOLS.has(toolName)) {
        operations.add('ui');
      } else if (UI_READ_TOOLS.has(toolName)) {
        operations.add('read');
      } else {
        operations.add('unknown');
        parseConfidence = 'low';
      }
    }
  }

  if (operations.size === 0) {
    operations.add('unknown');
  }

  const outsideWorkspace =
    touchedPaths.length > 0 &&
    touchedPaths.some((targetPath) =>
      workspaceContext &&
      typeof workspaceContext.isPathWithinWorkspace === 'function'
        ? !workspaceContext.isPathWithinWorkspace(targetPath)
        : !workspaceRoots.some((root) => isPathWithinRoot(root, targetPath)),
    );

  return {
    toolName,
    operations: Array.from(operations),
    roots: [toolName],
    touchedPaths,
    outsideWorkspace,
    usesPrivilege: false,
    hasUnboundedScopeSignals,
    parseConfidence,
    provenance: normalizeProvenance(provenance),
    rawSummary,
  };
}
