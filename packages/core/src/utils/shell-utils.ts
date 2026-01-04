/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'node:os';
import { quote } from 'shell-quote';
import {
  spawn,
  spawnSync,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';
import type { Node } from 'web-tree-sitter';
import { Language, Parser, Query } from 'web-tree-sitter';
import { loadWasmBinary } from './fileUtils.js';
import { debugLogger } from './debugLogger.js';

import { SHELL_TOOL_NAME } from '../tools/tool-names.js';

export const SHELL_TOOL_NAMES = [
  'run_shell_command',
  'ShellTool',
  SHELL_TOOL_NAME,
];

/**
 * An identifier for the shell type.
 */
export type ShellType = 'cmd' | 'powershell' | 'bash';

/**
 * Defines the configuration required to execute a command string within a specific shell.
 */
export interface ShellConfiguration {
  /** The path or name of the shell executable (e.g., 'bash', 'powershell.exe'). */
  executable: string;
  /**
   * The arguments required by the shell to execute a subsequent string argument.
   */
  argsPrefix: string[];
  /** An identifier for the shell type. */
  shell: ShellType;
}

let bashLanguage: Language | null = null;
let treeSitterInitialization: Promise<void> | null = null;
let treeSitterInitializationError: Error | null = null;

class ShellParserInitializationError extends Error {
  constructor(cause: Error) {
    super(`Failed to initialize bash parser: ${cause.message}`, { cause });
    this.name = 'ShellParserInitializationError';
  }
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  return new Error('Unknown tree-sitter initialization error', {
    cause: value,
  });
}

async function loadBashLanguage(): Promise<void> {
  try {
    treeSitterInitializationError = null;
    const [treeSitterBinary, bashBinary] = await Promise.all([
      loadWasmBinary(
        () =>
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore resolved by esbuild-plugin-wasm during bundling
          import('web-tree-sitter/tree-sitter.wasm?binary'),
        'web-tree-sitter/tree-sitter.wasm',
      ),
      loadWasmBinary(
        () =>
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore resolved by esbuild-plugin-wasm during bundling
          import('tree-sitter-bash/tree-sitter-bash.wasm?binary'),
        'tree-sitter-bash/tree-sitter-bash.wasm',
      ),
    ]);

    await Parser.init({ wasmBinary: treeSitterBinary });
    bashLanguage = await Language.load(bashBinary);
  } catch (error) {
    bashLanguage = null;
    const normalized = toError(error);
    const initializationError =
      normalized instanceof ShellParserInitializationError
        ? normalized
        : new ShellParserInitializationError(normalized);
    treeSitterInitializationError = initializationError;
    throw initializationError;
  }
}

export async function initializeShellParsers(): Promise<void> {
  if (!treeSitterInitialization) {
    treeSitterInitialization = loadBashLanguage().catch((error) => {
      // Don't fail the initialization promise, just log it.
      // The unavailability of the parser is handled by checking bashLanguage/treeSitterInitializationError.
      const normalized = toError(error);
      treeSitterInitializationError = normalized;
      debugLogger.warn(
        'Failed to initialize tree-sitter parser, falling back to regex:',
        normalized.message,
      );
    });
  }

  await treeSitterInitialization;
}

export interface ParsedCommandDetail {
  name: string;
  text: string;
}

interface CommandParseResult {
  details: ParsedCommandDetail[];
  hasError: boolean;
  mode?: 'tree-sitter' | 'fallback' | 'powershell';
}

const POWERSHELL_COMMAND_ENV = '__GCLI_POWERSHELL_COMMAND__';

// Encode the parser script as UTF-16LE base64 so we can pass it via PowerShell's -EncodedCommand flag;
// this avoids brittle quoting/escaping when spawning PowerShell and ensures the script is received byte-for-byte.
const POWERSHELL_PARSER_SCRIPT = Buffer.from(
  `
$ErrorActionPreference = 'Stop'
$commandText = $env:${POWERSHELL_COMMAND_ENV}
if ([string]::IsNullOrEmpty($commandText)) {
  Write-Output '{"success":false}'
  exit 0
}
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($commandText, [ref]$tokens, [ref]$errors)
if ($errors -and $errors.Count -gt 0) {
  Write-Output '{"success":false}'
  exit 0
}
$commandAsts = $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] }, $true)
$commandObjects = @()
foreach ($commandAst in $commandAsts) {
  $name = $commandAst.GetCommandName()
  if ([string]::IsNullOrWhiteSpace($name)) {
    continue
  }
  $commandObjects += [PSCustomObject]@{
    name = $name
    text = $commandAst.Extent.Text.Trim()
  }
}
[PSCustomObject]@{
  success = $true
  commands = $commandObjects
} | ConvertTo-Json -Compress
`,
  'utf16le',
).toString('base64');

function createParser(): Parser | null {
  if (!bashLanguage) {
    if (treeSitterInitializationError) {
      throw treeSitterInitializationError;
    }
    return null;
  }

  try {
    const parser = new Parser();
    parser.setLanguage(bashLanguage);
    return parser;
  } catch {
    return null;
  }
}

function parseCommandTree(command: string) {
  const parser = createParser();
  if (!parser || !command.trim()) {
    return null;
  }

  try {
    return parser.parse(command);
  } catch {
    return null;
  }
}

function normalizeCommandName(raw: string): string {
  if (raw.length >= 2) {
    const first = raw[0];
    const last = raw[raw.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return raw.slice(1, -1);
    }
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.split(/[\\/]/).pop() ?? trimmed;
}

function extractNameFromNode(node: Node): string | null {
  switch (node.type) {
    case 'command': {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) {
        return null;
      }
      return normalizeCommandName(nameNode.text);
    }
    case 'declaration_command':
    case 'unset_command':
    case 'test_command': {
      const firstChild = node.child(0);
      if (!firstChild) {
        return null;
      }
      return normalizeCommandName(firstChild.text);
    }
    default:
      return null;
  }
}

function collectCommandDetails(
  root: Node,
  source: string,
): ParsedCommandDetail[] {
  const stack: Node[] = [root];
  const details: ParsedCommandDetail[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const commandName = extractNameFromNode(current);
    if (commandName) {
      details.push({
        name: commandName,
        text: source.slice(current.startIndex, current.endIndex).trim(),
      });
    }

    for (let i = current.namedChildCount - 1; i >= 0; i -= 1) {
      const child = current.namedChild(i);
      if (child) {
        stack.push(child);
      }
    }
  }

  return details;
}

function hasPromptCommandTransform(root: Node): boolean {
  const stack: Node[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (current.type === 'expansion') {
      for (let i = 0; i < current.childCount - 1; i += 1) {
        const operatorNode = current.child(i);
        const transformNode = current.child(i + 1);

        if (
          operatorNode?.text === '@' &&
          transformNode?.text?.toLowerCase() === 'p'
        ) {
          return true;
        }
      }
    }

    for (let i = current.namedChildCount - 1; i >= 0; i -= 1) {
      const child = current.namedChild(i);
      if (child) {
        stack.push(child);
      }
    }
  }

  return false;
}

function parseBashCommandDetails(command: string): CommandParseResult | null {
  if (treeSitterInitializationError) {
    return fallbackParseBashCommandDetails(command);
  }

  if (!bashLanguage) {
    initializeShellParsers().catch(() => {
      // The failure path is surfaced via treeSitterInitializationError.
    });
    return fallbackParseBashCommandDetails(command);
  }

  const tree = parseCommandTree(command);
  if (!tree) {
    return fallbackParseBashCommandDetails(command);
  }

  const details = collectCommandDetails(tree.rootNode, command);

  const hasError =
    tree.rootNode.hasError ||
    details.length === 0 ||
    hasPromptCommandTransform(tree.rootNode);

  if (hasError) {
    let query = null;
    try {
      query = new Query(bashLanguage, '(ERROR) @error (MISSING) @missing');
      const captures = query.captures(tree.rootNode);
      const syntaxErrors = captures.map((capture) => {
        const { node, name } = capture;
        const type = name === 'missing' ? 'Missing' : 'Error';
        return `${type} node: "${node.text}" at ${node.startPosition.row}:${node.startPosition.column}`;
      });

      debugLogger.log(
        'Bash command parsing error detected for command:',
        command,
        'Syntax Errors:',
        syntaxErrors,
      );
    } catch (_e) {
      // Ignore query errors
    } finally {
      query?.delete();
    }
  }
  return {
    details,
    hasError,
    mode: 'tree-sitter',
  };
}

function parsePowerShellCommandDetails(
  command: string,
  executable: string,
): CommandParseResult | null {
  const trimmed = command.trim();
  if (!trimmed) {
    return {
      details: [],
      hasError: true,
      mode: 'powershell',
    };
  }

  try {
    const result = spawnSync(
      executable,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        POWERSHELL_PARSER_SCRIPT,
      ],
      {
        env: {
          ...process.env,
          [POWERSHELL_COMMAND_ENV]: command,
        },
        encoding: 'utf-8',
      },
    );

    if (result.error || result.status !== 0) {
      return null;
    }

    const output = (result.stdout ?? '').toString().trim();
    if (!output) {
      return { details: [], hasError: true };
    }

    let parsed: {
      success?: boolean;
      commands?: Array<{ name?: string; text?: string }>;
    } | null = null;
    try {
      parsed = JSON.parse(output);
    } catch {
      return { details: [], hasError: true };
    }

    if (!parsed?.success) {
      return { details: [], hasError: true };
    }

    const details = (parsed.commands ?? [])
      .map((commandDetail) => {
        if (!commandDetail || typeof commandDetail.name !== 'string') {
          return null;
        }

        const name = normalizeCommandName(commandDetail.name);
        const text =
          typeof commandDetail.text === 'string'
            ? commandDetail.text.trim()
            : command;

        return {
          name,
          text,
        };
      })
      .filter((detail): detail is ParsedCommandDetail => detail !== null);

    return {
      details,
      hasError: details.length === 0,
      mode: 'powershell',
    };
  } catch {
    return null;
  }
}

function fallbackParseBashCommandDetails(command: string): CommandParseResult {
  const trimmed = command.trim();
  if (!trimmed) {
    return { details: [], hasError: true, mode: 'fallback' };
  }

  // Block prompt transformations (${var@P}) even while the tree-sitter parser is initializing.
  // These transformations can execute commands as part of parameter expansion.
  if (/\$\{[^}]*@[pP][^}]*\}/.test(command)) {
    return { details: [], hasError: true, mode: 'fallback' };
  }

  const details: ParsedCommandDetail[] = [];
  let hasError = false;

  const pushSegment = (segment: string) => {
    const text = segment.trim();
    if (!text) {
      hasError = true;
      return;
    }
    const name = fallbackExtractCommandName(text);
    if (name) {
      details.push({ name, text });
    } else {
      // Keep the segment text even if we couldn't confidently extract the name.
      details.push({ name: '', text });
      hasError = true;
    }
  };

  const splitTopLevel = (input: string) => {
    let inSingle = false;
    let inDouble = false;
    let escaped = false;
    let start = 0;

    const flushUntil = (end: number) => {
      pushSegment(input.slice(start, end));
      start = end;
    };

    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\\\') {
        if (inSingle) {
          continue;
        }
        escaped = true;
        continue;
      }

      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
        continue;
      }
      if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
        continue;
      }

      if (inSingle || inDouble) {
        continue;
      }

      // Command chaining and pipelines.
      const next = input[i + 1];
      if (ch === '&' && next === '&') {
        flushUntil(i);
        start = i + 2;
        i += 1;
        continue;
      }
      if (ch === '|' && next === '|') {
        flushUntil(i);
        start = i + 2;
        i += 1;
        continue;
      }
      if (ch === ';' || ch === '\n') {
        flushUntil(i);
        start = i + 1;
        continue;
      }
      if (ch === '|') {
        // Avoid treating "||" as a pipeline (handled above).
        flushUntil(i);
        // Support |& (pipe both stdout and stderr).
        start = next === '&' ? i + 2 : i + 1;
        if (next === '&') {
          i += 1;
        }
        continue;
      }
      if (ch === '&') {
        // Standalone background operator. Avoid splitting on redirections like 2>&1.
        const prev = i > 0 ? input[i - 1] : '';
        const looksLikeRedirection = prev === '>';
        if (!looksLikeRedirection) {
          flushUntil(i);
          start = i + 1;
        }
      }
    }

    if (inSingle || inDouble || escaped) {
      hasError = true;
    }

    if (start < input.length) {
      pushSegment(input.slice(start));
    } else if (start === input.length) {
      // Command ended on an operator.
      hasError = true;
    }
  };

  splitTopLevel(command);

  // Best-effort extraction of commands hidden in substitutions (e.g. $(...), `...`, <(...), >(...)).
  for (const sub of fallbackExtractSubcommandStrings(command)) {
    const parsed = fallbackParseBashCommandDetails(sub);
    details.push(...parsed.details);
    hasError = hasError || parsed.hasError;
  }

  return {
    details,
    hasError: hasError || details.length === 0,
    mode: 'fallback',
  };
}

function fallbackExtractCommandName(segment: string): string | null {
  let index = 0;

  const readToken = (): string | null => {
    while (index < segment.length && /\s/.test(segment[index])) {
      index += 1;
    }
    if (index >= segment.length) return null;

    let inSingle = false;
    let inDouble = false;
    let escaped = false;
    const start = index;

    while (index < segment.length) {
      const ch = segment[index];
      if (escaped) {
        escaped = false;
        index += 1;
        continue;
      }
      if (ch === '\\\\' && !inSingle) {
        escaped = true;
        index += 1;
        continue;
      }
      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
        index += 1;
        continue;
      }
      if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
        index += 1;
        continue;
      }
      if (!inSingle && !inDouble && /\s/.test(ch)) {
        break;
      }
      index += 1;
    }

    const token = segment.slice(start, index).trim();
    return token || null;
  };

  for (let i = 0; i < 20; i += 1) {
    const token = readToken();
    if (!token) {
      return null;
    }

    // Skip leading environment assignments (FOO=bar).
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
      continue;
    }

    return normalizeCommandName(token);
  }

  return null;
}

function fallbackExtractSubcommandStrings(command: string): string[] {
  const extracted: string[] = [];
  const source = command;

  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  const extractParenGroup = (
    startIndex: number,
  ): { inner: string; end: number } | null => {
    let depth = 1;
    let i = startIndex;
    let localInSingle = false;
    let localInDouble = false;
    let localEscaped = false;

    while (i < source.length) {
      const ch = source[i];
      if (localEscaped) {
        localEscaped = false;
        i += 1;
        continue;
      }
      if (ch === '\\\\' && !localInSingle) {
        localEscaped = true;
        i += 1;
        continue;
      }
      if (ch === "'" && !localInDouble) {
        localInSingle = !localInSingle;
        i += 1;
        continue;
      }
      if (ch === '"' && !localInSingle) {
        localInDouble = !localInDouble;
        i += 1;
        continue;
      }
      if (localInSingle || localInDouble) {
        i += 1;
        continue;
      }
      if (ch === '(') {
        depth += 1;
      } else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          return { inner: source.slice(startIndex, i), end: i + 1 };
        }
      }
      i += 1;
    }

    return null;
  };

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\\\' && !inSingle) {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (inSingle) {
      continue;
    }

    // $(
    if (ch === '$' && source[i + 1] === '(') {
      const group = extractParenGroup(i + 2);
      if (group) {
        extracted.push(group.inner);
        i = group.end - 1;
      }
      continue;
    }

    // <( or >(
    if ((ch === '<' || ch === '>') && source[i + 1] === '(') {
      const group = extractParenGroup(i + 2);
      if (group) {
        extracted.push(group.inner);
        i = group.end - 1;
      }
      continue;
    }

    // Backticks
    if (ch === '`') {
      let j = i + 1;
      let backtickEscaped = false;
      while (j < source.length) {
        const cj = source[j];
        if (backtickEscaped) {
          backtickEscaped = false;
          j += 1;
          continue;
        }
        if (cj === '\\\\') {
          backtickEscaped = true;
          j += 1;
          continue;
        }
        if (cj === '`') {
          extracted.push(source.slice(i + 1, j));
          i = j;
          break;
        }
        j += 1;
      }
    }
  }

  return extracted.map((s) => s.trim()).filter(Boolean);
}

export function parseCommandDetails(
  command: string,
): CommandParseResult | null {
  const configuration = getShellConfiguration();

  if (configuration.shell === 'powershell') {
    return parsePowerShellCommandDetails(command, configuration.executable);
  }

  if (configuration.shell === 'bash') {
    return parseBashCommandDetails(command);
  }

  return null;
}

/**
 * Determines the appropriate shell configuration for the current platform.
 *
 * This ensures we can execute command strings predictably and securely across platforms
 * using the `spawn(executable, [...argsPrefix, commandString], { shell: false })` pattern.
 *
 * @returns The ShellConfiguration for the current environment.
 */
export function getShellConfiguration(): ShellConfiguration {
  if (isWindows()) {
    const comSpec = process.env['ComSpec'];
    if (comSpec) {
      const executable = comSpec.toLowerCase();
      if (
        executable.endsWith('powershell.exe') ||
        executable.endsWith('pwsh.exe')
      ) {
        return {
          executable: comSpec,
          argsPrefix: ['-NoProfile', '-Command'],
          shell: 'powershell',
        };
      }
    }

    // Default to PowerShell for all other Windows configurations.
    return {
      executable: 'powershell.exe',
      argsPrefix: ['-NoProfile', '-Command'],
      shell: 'powershell',
    };
  }

  // Unix-like systems (Linux, macOS)
  return { executable: 'bash', argsPrefix: ['-c'], shell: 'bash' };
}

/**
 * Export the platform detection constant for use in process management (e.g., killing processes).
 */
export const isWindows = () => os.platform() === 'win32';

/**
 * Escapes a string so that it can be safely used as a single argument
 * in a shell command, preventing command injection.
 *
 * @param arg The argument string to escape.
 * @param shell The type of shell the argument is for.
 * @returns The shell-escaped string.
 */
export function escapeShellArg(arg: string, shell: ShellType): string {
  if (!arg) {
    return '';
  }

  switch (shell) {
    case 'powershell':
      // For PowerShell, wrap in single quotes and escape internal single quotes by doubling them.
      return `'${arg.replace(/'/g, "''")}'`;
    case 'cmd':
      // Simple Windows escaping for cmd.exe: wrap in double quotes and escape inner double quotes.
      return `"${arg.replace(/"/g, '""')}"`;
    case 'bash':
    default:
      // POSIX shell escaping using shell-quote.
      return quote([arg]);
  }
}

/**
 * Splits a shell command into a list of individual commands, respecting quotes.
 * This is used to separate chained commands (e.g., using &&, ||, ;).
 * @param command The shell command string to parse
 * @returns An array of individual command strings
 */
export function splitCommands(command: string): string[] {
  const parsed = parseCommandDetails(command);
  if (!parsed || parsed.hasError) {
    return [];
  }

  return parsed.details.map((detail) => detail.text).filter(Boolean);
}

/**
 * Extracts the root command from a given shell command string.
 * This is used to identify the base command for permission checks.
 * @param command The shell command string to parse
 * @returns The root command name, or undefined if it cannot be determined
 * @example getCommandRoot("ls -la /tmp") returns "ls"
 * @example getCommandRoot("git status && npm test") returns "git"
 */
export function getCommandRoot(command: string): string | undefined {
  const parsed = parseCommandDetails(command);
  if (!parsed || parsed.hasError || parsed.details.length === 0) {
    return undefined;
  }

  return parsed.details[0]?.name;
}

export function getCommandRoots(command: string): string[] {
  if (!command) {
    return [];
  }

  const parsed = parseCommandDetails(command);
  if (!parsed || parsed.hasError) {
    return [];
  }

  return parsed.details.map((detail) => detail.name).filter(Boolean);
}

export function stripShellWrapper(command: string): string {
  const pattern =
    /^\s*(?:(?:sh|bash|zsh)\s+-c|cmd\.exe\s+\/c|powershell(?:\.exe)?\s+(?:-NoProfile\s+)?-Command|pwsh(?:\.exe)?\s+(?:-NoProfile\s+)?-Command)\s+/i;
  const match = command.match(pattern);
  if (match) {
    let newCommand = command.substring(match[0].length).trim();
    if (
      (newCommand.startsWith('"') && newCommand.endsWith('"')) ||
      (newCommand.startsWith("'") && newCommand.endsWith("'"))
    ) {
      newCommand = newCommand.substring(1, newCommand.length - 1);
    }
    return newCommand;
  }
  return command.trim();
}

/**
 * Detects command substitution patterns in a shell command, following bash quoting rules:
 * - Single quotes ('): Everything literal, no substitution possible
 * - Double quotes ("): Command substitution with $() and backticks unless escaped with \
 * - No quotes: Command substitution with $(), <(), and backticks
 * @param command The shell command string to check
 * @returns true if command substitution would be executed by bash
 */
/**
 * Determines whether a given shell command is allowed to execute based on
 * the tool's configuration including allowlists and blocklists.
 *
 * This function operates in "default allow" mode. It is a wrapper around
 * `checkCommandPermissions`.
 *
 * @param command The shell command string to validate.
 * @param config The application configuration.
 * @returns An object with 'allowed' boolean and optional 'reason' string if not allowed.
 */
export const spawnAsync = (
  command: string,
  args: string[],
  options?: SpawnOptionsWithoutStdio,
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with exit code ${code}:\n${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
