/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export const REPL_TOOL_NAME = 'execute_repl';
export const SHELL_TOOL_NAME = 'run_terminal_command';
export const PROCESS_MANAGER_TOOL_NAME = 'manage_processes';
export const GLOB_TOOL_NAME = 'glob_files';
export const GREP_TOOL_NAME = 'grep_search';
export const LS_TOOL_NAME = 'list_files';
export const READ_FILE_TOOL_NAME = 'read_file';
export const MEMORY_TOOL_NAME = 'save_memory';
export const WRITE_TODOS_TOOL_NAME = 'manage_todos';
export const DISCOVERED_TOOL_PREFIX = 'external_';
export const EDIT_TOOL_NAME = 'edit_file';
export const SMART_EDIT_TOOL_NAME = 'smart_edit_file';
export const EDIT_TOOL_NAMES = new Set([EDIT_TOOL_NAME, SMART_EDIT_TOOL_NAME]);
export const WRITE_FILE_TOOL_NAME = 'write_to_file';
export const READ_MANY_FILES_TOOL_NAME = 'read_many_files';
export const FILE_OPS_TOOL_NAME = 'file_operations';
export const AGENT_CONTROL_TOOL_NAME = 'agent_control';
export const WEB_FETCH_TOOL_NAME = 'web_fetch';
export const WEB_SEARCH_TOOL_NAME = 'search_web';
export const DELEGATE_TO_AGENT_TOOL_NAME = 'delegate_to_agent';
export const GET_INTERNAL_DOCS_TOOL_NAME = 'get_internal_docs';

export const ALL_BUILTIN_TOOL_NAMES = [
  REPL_TOOL_NAME,
  SHELL_TOOL_NAME,
  PROCESS_MANAGER_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  LS_TOOL_NAME,
  READ_FILE_TOOL_NAME,
  MEMORY_TOOL_NAME,
  WRITE_TODOS_TOOL_NAME,
  EDIT_TOOL_NAME,
  SMART_EDIT_TOOL_NAME,
  WRITE_FILE_TOOL_NAME,
  READ_MANY_FILES_TOOL_NAME,
  FILE_OPS_TOOL_NAME,
  AGENT_CONTROL_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  DELEGATE_TO_AGENT_TOOL_NAME,
  GET_INTERNAL_DOCS_TOOL_NAME,
];

interface IsValidToolNameOptions {
  allowWildcards?: boolean;
}

export function isValidToolName(
  name: string,
  options?: IsValidToolNameOptions,
): boolean {
  if (!name) return false;

  const allowWildcards = options?.allowWildcards ?? false;

  // Check for built-in tool names
  if (ALL_BUILTIN_TOOL_NAMES.includes(name)) {
    return true;
  }

  // Check for discovered tool prefix
  if (name.startsWith(DISCOVERED_TOOL_PREFIX)) {
    return /^[a-zA-Z0-9_-]+$/.test(name);
  }

  // Check for MCP-style tool names (server__tool format)
  const mcpPattern = /^[a-zA-Z0-9-]+__[a-zA-Z0-9-]+$/;
  if (mcpPattern.test(name)) {
    return true;
  }

  // Handle wildcards if allowed
  if (allowWildcards) {
    if (name === '*') return true;
    // server__* pattern
    const wildcardPattern = /^[a-zA-Z0-9-]+__\*$/;
    if (wildcardPattern.test(name)) return true;
  }

  return false;
}
