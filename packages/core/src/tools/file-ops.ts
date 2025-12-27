/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { Config } from '../config/config.js';
import { DEFAULT_FILE_FILTERING_OPTIONS } from '../config/constants.js';
import { getErrorMessage, isNodeError } from '../utils/errors.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import type {
  ToolCallConfirmationDetails,
  ToolExecuteConfirmationDetails,
  ToolInvocation,
  ToolResult,
  ToolConfirmationOutcome,
} from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { FILE_OPS_TOOL_NAME } from './tool-names.js';
import { buildToolActionProfile } from '../safety/approval-ladder/buildToolActionProfile.js';
import { computeMinimumReviewLevel } from '../safety/approval-ladder/computeMinimumReviewLevel.js';

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_ENTRIES = 200;
const MAX_MAX_ENTRIES = 1000;
const MAX_MAX_DEPTH = 10;

export type FileOpsOperation =
  | 'mkdir'
  | 'move'
  | 'copy'
  | 'delete'
  | 'list_tree';

export interface FileOpsToolParams {
  operation: FileOpsOperation;
  path?: string;
  from?: string;
  to?: string;
  parents?: boolean;
  overwrite?: boolean;
  recursive?: boolean;
  maxDepth?: number;
  maxEntries?: number;
}

type TreeEntry = {
  name: string;
  path: string;
  depth: number;
  isDirectory: boolean;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const normalizePathInput = (value?: string): string => (value ?? '').trim();

const formatPath = (config: Config, resolvedPath: string): string => {
  const relativePath = makeRelative(resolvedPath, config.getTargetDir());
  return shortenPath(relativePath);
};

const mapFileError = (error: unknown): ToolErrorType => {
  if (isNodeError(error)) {
    if (error.code === 'ENOENT') {
      return ToolErrorType.FILE_NOT_FOUND;
    }
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return ToolErrorType.PERMISSION_DENIED;
    }
  }
  return ToolErrorType.EXECUTION_FAILED;
};

class FileOpsToolInvocation extends BaseToolInvocation<
  FileOpsToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: FileOpsToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  override getDescription(): string {
    switch (this.params.operation) {
      case 'mkdir':
        return `Create directory ${this.params.path ?? ''}`.trim();
      case 'move':
        return `Move ${this.params.from ?? ''} -> ${this.params.to ?? ''}`.trim();
      case 'copy':
        return `Copy ${this.params.from ?? ''} -> ${this.params.to ?? ''}`.trim();
      case 'delete':
        return `Delete ${this.params.path ?? ''}`.trim();
      case 'list_tree':
        return `List tree ${this.params.path ?? ''}`.trim();
      default:
        return 'File operations';
    }
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    const { operation } = this.params;
    const actionProfile = buildToolActionProfile({
      toolName: FILE_OPS_TOOL_NAME,
      args: this.params as unknown as Record<string, unknown>,
      config: this.config,
      provenance: this.getProvenance(),
    });
    const reviewResult = computeMinimumReviewLevel(actionProfile);
    if (reviewResult.level === 'A') {
      return false;
    }

    const command = (() => {
      if (operation === 'move') {
        return `move ${this.params.from} ${this.params.to}`;
      }
      if (operation === 'copy') {
        return `copy ${this.params.from} ${this.params.to}`;
      }
      if (operation === 'delete') {
        return `delete ${this.params.path}`;
      }
      if (operation === 'mkdir') {
        return `mkdir ${this.params.path}`;
      }
      return operation;
    })();

    const confirmationDetails: ToolExecuteConfirmationDetails = {
      type: 'exec',
      title: 'Confirm File Operation',
      command,
      rootCommand: operation,
      provenance:
        this.getProvenance().length > 0 ? this.getProvenance() : undefined,
      reviewLevel: reviewResult.level,
      requiresPin: reviewResult.requiresPin,
      pinLength: reviewResult.requiresPin ? 6 : undefined,
      explanation: reviewResult.reasons.join('; '),
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        await this.publishPolicyUpdate(outcome);
      },
    };

    return confirmationDetails;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    if (this.config.getPreviewMode()) {
      const description = this.getDescription();
      return {
        llmContent: `[PREVIEW] Would perform: ${description}`,
        returnDisplay: `[PREVIEW] ${description}`,
      };
    }
    try {
      switch (this.params.operation) {
        case 'mkdir':
          return await this.makeDirectory();
        case 'move':
          return await this.movePath();
        case 'copy':
          return await this.copyPath();
        case 'delete':
          return await this.deletePath();
        case 'list_tree':
          return await this.listTree();
        default:
          return this.errorResult(
            `Unsupported operation: ${this.params.operation}`,
            ToolErrorType.INVALID_TOOL_PARAMS,
          );
      }
    } catch (error) {
      const message = `File operation failed: ${getErrorMessage(error)}`;
      return this.errorResult(message, mapFileError(error));
    }
  }

  private errorResult(message: string, type: ToolErrorType): ToolResult {
    return {
      llmContent: `Error: ${message}`,
      returnDisplay: message,
      error: {
        message,
        type,
      },
    };
  }

  private resolveWorkspacePath(input?: string): string {
    const trimmed = normalizePathInput(input);
    if (!trimmed) {
      throw new Error('Path is required.');
    }
    const resolved = path.resolve(this.config.getTargetDir(), trimmed);
    const workspaceContext = this.config.getWorkspaceContext();
    if (!workspaceContext.isPathWithinWorkspace(resolved)) {
      throw new Error(`Path '${trimmed}' is not within the workspace.`);
    }
    return resolved;
  }

  private async makeDirectory(): Promise<ToolResult> {
    const resolvedPath = this.resolveWorkspacePath(this.params.path);
    const parents = this.params.parents ?? false;

    try {
      const existing = await fs.stat(resolvedPath);
      if (!existing.isDirectory()) {
        return this.errorResult(
          `Path is not a directory: ${formatPath(this.config, resolvedPath)}`,
          ToolErrorType.PATH_IS_NOT_A_DIRECTORY,
        );
      }
      return {
        llmContent: `Directory already exists: ${formatPath(this.config, resolvedPath)}`,
        returnDisplay: `Directory already exists: ${formatPath(this.config, resolvedPath)}`,
      };
    } catch (error) {
      if (isNodeError(error) && error.code !== 'ENOENT') {
        return this.errorResult(
          `Failed to access directory: ${getErrorMessage(error)}`,
          mapFileError(error),
        );
      }
    }

    await fs.mkdir(resolvedPath, { recursive: parents });
    return {
      llmContent: `Created directory: ${formatPath(this.config, resolvedPath)}`,
      returnDisplay: `Created directory: ${formatPath(this.config, resolvedPath)}`,
    };
  }

  private async movePath(): Promise<ToolResult> {
    const resolvedFrom = this.resolveWorkspacePath(this.params.from);
    const resolvedTo = this.resolveWorkspacePath(this.params.to);
    const overwrite = this.params.overwrite ?? false;

    if (resolvedFrom === resolvedTo) {
      return this.errorResult(
        'Source and destination are the same.',
        ToolErrorType.INVALID_TOOL_PARAMS,
      );
    }

    const fromStats = await fs.lstat(resolvedFrom);

    const destinationExists = await fs
      .stat(resolvedTo)
      .then(() => true)
      .catch((error) => {
        if (isNodeError(error) && error.code === 'ENOENT') {
          return false;
        }
        throw error;
      });

    if (destinationExists) {
      if (!overwrite) {
        return this.errorResult(
          `Destination already exists: ${formatPath(this.config, resolvedTo)}`,
          ToolErrorType.FILE_WRITE_FAILURE,
        );
      }
      await fs.rm(resolvedTo, { recursive: true, force: true });
    }

    try {
      await fs.rename(resolvedFrom, resolvedTo);
    } catch (error) {
      if (isNodeError(error) && error.code === 'EXDEV') {
        await fs.cp(resolvedFrom, resolvedTo, {
          recursive: fromStats.isDirectory(),
          dereference: false,
          force: overwrite,
        });
        await fs.rm(resolvedFrom, {
          recursive: fromStats.isDirectory(),
          force: true,
        });
      } else {
        throw error;
      }
    }

    return {
      llmContent: `Moved ${formatPath(this.config, resolvedFrom)} to ${formatPath(this.config, resolvedTo)}.`,
      returnDisplay: `Moved ${formatPath(this.config, resolvedFrom)} to ${formatPath(this.config, resolvedTo)}.`,
    };
  }

  private async copyPath(): Promise<ToolResult> {
    const resolvedFrom = this.resolveWorkspacePath(this.params.from);
    const resolvedTo = this.resolveWorkspacePath(this.params.to);
    const overwrite = this.params.overwrite ?? false;
    const recursive = this.params.recursive ?? false;

    const fromStats = await fs.lstat(resolvedFrom);
    if (fromStats.isDirectory() && !recursive) {
      return this.errorResult(
        'Copying a directory requires recursive=true.',
        ToolErrorType.INVALID_TOOL_PARAMS,
      );
    }

    const destinationExists = await fs
      .stat(resolvedTo)
      .then(() => true)
      .catch((error) => {
        if (isNodeError(error) && error.code === 'ENOENT') {
          return false;
        }
        throw error;
      });

    if (destinationExists && !overwrite) {
      return this.errorResult(
        `Destination already exists: ${formatPath(this.config, resolvedTo)}`,
        ToolErrorType.FILE_WRITE_FAILURE,
      );
    }

    await fs.cp(resolvedFrom, resolvedTo, {
      recursive: fromStats.isDirectory(),
      dereference: false,
      force: overwrite,
    });

    return {
      llmContent: `Copied ${formatPath(this.config, resolvedFrom)} to ${formatPath(this.config, resolvedTo)}.`,
      returnDisplay: `Copied ${formatPath(this.config, resolvedFrom)} to ${formatPath(this.config, resolvedTo)}.`,
    };
  }

  private async deletePath(): Promise<ToolResult> {
    const resolvedPath = this.resolveWorkspacePath(this.params.path);
    const recursive = this.params.recursive ?? false;

    const stats = await fs.lstat(resolvedPath);
    if (stats.isDirectory() && !recursive) {
      return this.errorResult(
        'Deleting a directory requires recursive=true.',
        ToolErrorType.INVALID_TOOL_PARAMS,
      );
    }

    await fs.rm(resolvedPath, { recursive: stats.isDirectory(), force: false });
    return {
      llmContent: `Deleted ${formatPath(this.config, resolvedPath)}.`,
      returnDisplay: `Deleted ${formatPath(this.config, resolvedPath)}.`,
    };
  }

  private async listTree(): Promise<ToolResult> {
    const resolvedRoot = this.params.path
      ? this.resolveWorkspacePath(this.params.path)
      : this.config.getTargetDir();

    const maxDepth = clampNumber(
      Math.floor(this.params.maxDepth ?? DEFAULT_MAX_DEPTH),
      1,
      MAX_MAX_DEPTH,
    );
    const maxEntries = clampNumber(
      Math.floor(this.params.maxEntries ?? DEFAULT_MAX_ENTRIES),
      1,
      MAX_MAX_ENTRIES,
    );

    const stats = await fs.stat(resolvedRoot);
    if (!stats.isDirectory()) {
      return this.errorResult(
        `Path is not a directory: ${formatPath(this.config, resolvedRoot)}`,
        ToolErrorType.PATH_IS_NOT_A_DIRECTORY,
      );
    }

    const fileDiscovery = this.config.getFileService();
    const filterOptions = this.config.getFileFilteringOptions();

    const entries: TreeEntry[] = [];
    let truncated = false;

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > maxDepth || truncated) {
        return;
      }

      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const directories: TreeEntry[] = [];
      const files: TreeEntry[] = [];

      for (const dirent of dirents) {
        const entryPath = path.join(dir, dirent.name);
        const relativePath = path.relative(
          this.config.getTargetDir(),
          entryPath,
        );

        const shouldIgnore = fileDiscovery.shouldIgnoreFile(relativePath, {
          respectGitIgnore:
            filterOptions.respectGitIgnore ??
            DEFAULT_FILE_FILTERING_OPTIONS.respectGitIgnore,
          respectGeminiIgnore:
            filterOptions.respectGeminiIgnore ??
            DEFAULT_FILE_FILTERING_OPTIONS.respectGeminiIgnore,
        });

        if (shouldIgnore) {
          continue;
        }

        const entry: TreeEntry = {
          name: dirent.name,
          path: entryPath,
          depth,
          isDirectory: dirent.isDirectory(),
        };

        if (entry.isDirectory) {
          directories.push(entry);
        } else {
          files.push(entry);
        }
      }

      const sortByName = (a: TreeEntry, b: TreeEntry) =>
        a.name.localeCompare(b.name);
      directories.sort(sortByName);
      files.sort(sortByName);

      for (const entry of [...directories, ...files]) {
        if (entries.length >= maxEntries) {
          truncated = true;
          return;
        }
        entries.push(entry);
        if (entry.isDirectory) {
          await walk(entry.path, depth + 1);
        }
      }
    };

    await walk(resolvedRoot, 1);

    const header = `Tree for ${formatPath(this.config, resolvedRoot)} (maxDepth=${maxDepth}, maxEntries=${maxEntries})`;
    const lines = entries.map((entry) => {
      const indent = '  '.repeat(entry.depth - 1);
      const suffix = entry.isDirectory ? '/' : '';
      return `${indent}${entry.name}${suffix}`;
    });

    if (truncated) {
      lines.push('...');
      lines.push(
        `Truncated after ${maxEntries} entries. Increase maxEntries to see more.`,
      );
    }

    return {
      llmContent: [header, ...lines].join('\n'),
      returnDisplay: `Listed ${Math.min(entries.length, maxEntries)} entries.`,
    };
  }
}

export class FileOpsTool extends BaseDeclarativeTool<
  FileOpsToolParams,
  ToolResult
> {
  static readonly Name = FILE_OPS_TOOL_NAME;

  constructor(
    private readonly config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      FileOpsTool.Name,
      'FileOps',
      'Safe file operations (mkdir/move/copy/delete/list_tree) scoped to the workspace.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['mkdir', 'move', 'copy', 'delete', 'list_tree'],
            description: 'The file operation to perform.',
          },
          path: {
            type: 'string',
            description: 'Path for mkdir/delete/list_tree.',
          },
          from: {
            type: 'string',
            description: 'Source path for move/copy.',
          },
          to: {
            type: 'string',
            description: 'Destination path for move/copy.',
          },
          parents: {
            type: 'boolean',
            description: 'Whether mkdir should create parent directories.',
          },
          overwrite: {
            type: 'boolean',
            description: 'Whether to overwrite existing destinations.',
          },
          recursive: {
            type: 'boolean',
            description:
              'Whether to allow recursive operations for copy/delete.',
          },
          maxDepth: {
            type: 'integer',
            description: 'Maximum depth for list_tree.',
          },
          maxEntries: {
            type: 'integer',
            description: 'Maximum entries for list_tree.',
          },
        },
        required: ['operation'],
      },
      false,
      false,
      messageBus,
    );
  }

  protected override validateToolParamValues(
    params: FileOpsToolParams,
  ): string | null {
    const operation = params.operation;
    if (!operation) {
      return "The 'operation' parameter must be provided.";
    }

    const pathValue = normalizePathInput(params.path);
    const fromValue = normalizePathInput(params.from);
    const toValue = normalizePathInput(params.to);

    if (operation === 'mkdir' || operation === 'delete') {
      if (!pathValue) {
        return "The 'path' parameter must be provided for this operation.";
      }
    }

    if (operation === 'move' || operation === 'copy') {
      if (!fromValue || !toValue) {
        return "The 'from' and 'to' parameters must be provided for this operation.";
      }
    }

    if (operation === 'list_tree') {
      if (params.maxDepth !== undefined && params.maxDepth <= 0) {
        return "The 'maxDepth' parameter must be a positive integer.";
      }
      if (params.maxEntries !== undefined && params.maxEntries <= 0) {
        return "The 'maxEntries' parameter must be a positive integer.";
      }
    }

    const workspaceContext = this.config.getWorkspaceContext();
    const validateWorkspacePath = (
      value: string | undefined,
      label: string,
    ) => {
      if (!value) {
        return null;
      }
      const resolved = path.resolve(this.config.getTargetDir(), value);
      if (!workspaceContext.isPathWithinWorkspace(resolved)) {
        return `Path '${label}' is not within the workspace: ${value}`;
      }
      return null;
    };

    return (
      validateWorkspacePath(params.path, 'path') ??
      validateWorkspacePath(params.from, 'from') ??
      validateWorkspacePath(params.to, 'to')
    );
  }

  protected createInvocation(
    params: FileOpsToolParams,
    messageBus?: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<FileOpsToolParams, ToolResult> {
    return new FileOpsToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
