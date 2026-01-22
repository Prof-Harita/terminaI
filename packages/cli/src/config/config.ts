/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import process from 'node:process';
import net from 'node:net';
import { mcpCommand } from '../commands/mcp.js';
import { extensionsCommand } from '../commands/extensions.js';
import { hooksCommand } from '../commands/hooks.js';
import { voiceCommand } from '../commands/voice.js';
import type {
 ExtensionEvents ,
  type Config,
  ConfigBuilder,
  setGeminiMdFilename as setServerGeminiMdFilename,
  getCurrentGeminiMdFilename,
  ApprovalMode,
  DEFAULT_GEMINI_MODEL_AUTO,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  DEFAULT_FILE_FILTERING_OPTIONS,
  DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
  FileDiscoveryService,
  WRITE_FILE_TOOL_NAME,
  SHELL_TOOL_NAMES,
  SHELL_TOOL_NAME,
  REPL_TOOL_NAME,
  type ReplSandboxTier,
  resolveTelemetrySettings,
  FatalConfigError,
  getPty,
  EDIT_TOOL_NAME,
  debugLogger,
  loadServerHierarchicalMemory,
  WEB_FETCH_TOOL_NAME,
  getVersion,
  PREVIEW_GEMINI_MODEL_AUTO,
  type GeminiCLIExtension,
  type OutputFormat,
  type ConfigParameters } from '@terminai/core';
import type { Settings } from './settings.js';

import { loadSandboxConfig } from './sandboxConfig.js';
import { resolvePath } from '../utils/resolvePath.js';
import { appEvents } from '../utils/events.js';
import { RESUME_LATEST } from '../utils/sessionUtils.js';

import { isWorkspaceTrusted } from './trustedFolders.js';
import {
  createPolicyEngineConfig,
  resolvePolicyBrainAuthority,
} from './policy.js';
import { ExtensionManager } from './extension-manager.js';
import { requestConsentNonInteractive } from './extensions/consent.js';
import { promptForSetting } from './extensions/extensionSettings.js';
import type { EventEmitter } from 'node:stream';
import { runExitCleanup } from '../utils/cleanup.js';
import { settingsToProviderConfig } from './settingsToProviderConfig.js';

export interface CliArgs {
  query: string | undefined;
  model: string | undefined;
  sandbox: boolean | string | undefined;
  debug: boolean | undefined;
  replay: string | undefined;
  prompt: string | undefined;
  promptInteractive: string | undefined;
  preview: boolean | undefined;
  voice: boolean | undefined;
  voicePttKey: string | undefined;
  voiceStt: string | undefined;
  voiceTts: string | undefined;
  voiceMaxWords: number | undefined;
  webRemote: boolean | undefined;
  webRemoteHost: string | undefined;
  webRemotePort: number | undefined;
  webRemoteAllowedOrigins: string[] | undefined;
  webRemoteToken: string | undefined;
  webRemoteRotateToken: boolean | undefined;
  iUnderstandWebRemoteRisk: boolean | undefined;
  remoteBind: string | undefined;

  yolo: boolean | undefined;
  approvalMode: string | undefined;
  allowedMcpServerNames: string[] | undefined;
  allowedTools: string[] | undefined;
  experimentalAcp: boolean | undefined;

  extensions: string[] | undefined;
  listExtensions: boolean | undefined;
  resume: string | typeof RESUME_LATEST | undefined;
  listSessions: boolean | undefined;
  deleteSession: string | undefined;
  includeDirectories: string[] | undefined;
  screenReader: boolean | undefined;
  useSmartEdit: boolean | undefined;
  useWriteTodos: boolean | undefined;
  outputFormat: string | undefined;
  fakeResponses: string | undefined;
  recordResponses: string | undefined;
  dumpConfig?: boolean;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (normalized === 'localhost') {
    return true;
  }
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) {
    return normalized.startsWith('127.');
  }
  if (ipVersion === 6) {
    return normalized === '::1';
  }
  return false;
}

export async function parseArguments(settings: Settings): Promise<CliArgs> {
  const rawArgv = hideBin(process.argv);
  const yargsInstance = yargs(rawArgv)
    .locale('en')
    .scriptName('gemini')
    .usage(
      'Usage: gemini [options] [command]\n\nTerminaI - Launch an interactive CLI, use -p/--prompt for non-interactive mode',
    )

    .option('debug', {
      alias: 'd',
      type: 'boolean',
      description: 'Run in debug mode?',
      default: false,
    })
    .option('replay', {
      type: 'string',
      description: 'Replay a chat session from a log file',
    })
    .command('$0 [query..]', 'Launch TerminaI', (yargsInstance) =>
      yargsInstance
        .positional('query', {
          description:
            'Positional prompt. Defaults to one-shot; use -i/--prompt-interactive for interactive.',
        })
        .option('model', {
          alias: 'm',
          type: 'string',
          nargs: 1,
          description: `Model`,
        })
        .option('prompt', {
          alias: 'p',
          type: 'string',
          nargs: 1,
          description: 'Prompt. Appended to input on stdin (if any).',
        })
        .option('prompt-interactive', {
          alias: 'i',
          type: 'string',
          nargs: 1,
          description:
            'Execute the provided prompt and continue in interactive mode',
        })
        .option('sandbox', {
          alias: 's',
          type: 'boolean',
          description: 'Run in sandbox?',
        })
        .option('preview', {
          alias: 'P',
          type: 'boolean',
          description:
            'Preview mode: show planned actions without executing commands or writes.',
        })

        .option('yolo', {
          alias: 'y',
          type: 'boolean',
          description:
            'Automatically accept all actions (aka YOLO mode, see https://www.youtube.com/watch?v=xvFZjo5PgG0 for more details)?',
          default: false,
        })
        .option('approval-mode', {
          type: 'string',
          nargs: 1,
          choices: ['default', 'auto_edit', 'yolo'],
          description:
            'Set the approval mode: default (prompt for approval), auto_edit (auto-approve edit tools), yolo (auto-approve all tools)',
        })
        .option('experimental-acp', {
          type: 'boolean',
          description: 'Starts the agent in ACP mode',
        })

        .option('allowed-mcp-server-names', {
          type: 'array',
          string: true,
          nargs: 1,
          description: 'Allowed MCP server names',
          coerce: (mcpServerNames: string[]) =>
            // Handle comma-separated values
            mcpServerNames.flatMap((mcpServerName) =>
              mcpServerName.split(',').map((m) => m.trim()),
            ),
        })
        .option('allowed-tools', {
          type: 'array',
          string: true,
          nargs: 1,
          description: 'Tools that are allowed to run without confirmation',
          coerce: (tools: string[]) =>
            // Handle comma-separated values
            tools.flatMap((tool) => tool.split(',').map((t) => t.trim())),
        })
        .option('extensions', {
          alias: 'e',
          type: 'array',
          string: true,
          nargs: 1,
          description:
            'A list of extensions to use. If not provided, all extensions are used.',
          coerce: (extensions: string[]) =>
            // Handle comma-separated values
            extensions.flatMap((extension) =>
              extension.split(',').map((e) => e.trim()),
            ),
        })
        .option('list-extensions', {
          alias: 'l',
          type: 'boolean',
          description: 'List all available extensions and exit.',
        })
        .option('resume', {
          alias: 'r',
          type: 'string',
          // `skipValidation` so that we can distinguish between it being passed with a value, without
          // one, and not being passed at all.
          skipValidation: true,
          description:
            'Resume a previous session. Use "latest" for most recent or index number (e.g. --resume 5)',
          coerce: (value: string): string => {
            // When --resume passed with a value (`gemini --resume 123`): value = "123" (string)
            // When --resume passed without a value (`gemini --resume`): value = "" (string)
            // When --resume not passed at all: this `coerce` function is not called at all, and
            //   `yargsInstance.argv.resume` is undefined.
            if (value === '') {
              return RESUME_LATEST;
            }
            return value;
          },
        })
        .option('list-sessions', {
          type: 'boolean',
          description:
            'List available sessions for the current project and exit.',
        })
        .option('delete-session', {
          type: 'string',
          description:
            'Delete a session by index number (use --list-sessions to see available sessions).',
        })
        .option('include-directories', {
          type: 'array',
          string: true,
          nargs: 1,
          description:
            'Additional directories to include in the workspace (comma-separated or multiple --include-directories)',
          coerce: (dirs: string[]) =>
            // Handle comma-separated values
            dirs.flatMap((dir) => dir.split(',').map((d) => d.trim())),
        })
        .option('screen-reader', {
          type: 'boolean',
          description: 'Enable screen reader mode for accessibility.',
        })
        .option('voice', {
          type: 'boolean',
          description: 'Enable voice mode (push-to-talk).',
        })
        .option('voice-ptt-key', {
          type: 'string',
          nargs: 1,
          choices: ['space', 'ctrl+space'],
          description: 'Push-to-talk key binding for voice mode.',
        })
        .option('voice-stt', {
          type: 'string',
          nargs: 1,
          choices: ['auto', 'whispercpp', 'none'],
          description: 'Speech-to-text provider for voice mode.',
        })
        .option('voice-tts', {
          type: 'string',
          nargs: 1,
          choices: ['auto', 'none'],
          description: 'Text-to-speech provider for voice mode.',
        })
        .option('voice-max-words', {
          type: 'number',
          nargs: 1,
          description: 'Maximum words for spoken replies in voice mode.',
        })
        .option('web-remote', {
          type: 'boolean',
          description: 'Enable web-remote server (local execution surface).',
        })
        .option('web-remote-host', {
          type: 'string',
          nargs: 1,
          description: 'Host to bind the web-remote server.',
        })
        .option('remote-bind', {
          type: 'string',
          nargs: 1,
          description:
            'Explicit host binding for web-remote (required for non-loopback).',
        })
        .option('web-remote-port', {
          type: 'number',
          nargs: 1,
          description: 'Port to bind the web-remote server (0 for random).',
        })
        .option('web-remote-allowed-origins', {
          type: 'array',
          string: true,
          nargs: 1,
          description:
            'Allowlisted web origins for web-remote (comma-separated)',
          coerce: (origins: string[]) =>
            origins.flatMap((origin) => origin.split(',').map((o) => o.trim())),
        })
        .option('web-remote-token', {
          type: 'string',
          nargs: 1,
          description: 'Use a specific token for web-remote (not persisted).',
        })
        .option('web-remote-rotate-token', {
          type: 'boolean',
          description: 'Rotate the persisted web-remote token and exit.',
        })
        .option('i-understand-web-remote-risk', {
          type: 'boolean',
          description:
            'Acknowledge the security risk of binding web-remote to a non-loopback host.',
        })
        .option('output-format', {
          alias: 'o',
          type: 'string',
          nargs: 1,
          description: 'The format of the CLI output.',
          choices: ['text', 'json', 'stream-json'],
        })
        .option('fake-responses', {
          type: 'string',
          description: 'Path to a file with fake model responses for testing.',
          hidden: true,
        })
        .option('record-responses', {
          type: 'string',
          description: 'Path to a file to record model responses for testing.',
          hidden: true,
        })
        .option('dump-config', {
          type: 'boolean',
          description:
            'Dump the resolved configuration to stdout as JSON and exit.',
          hidden: true,
        })
        .deprecateOption(
          'prompt',
          'Use the positional prompt instead. This flag will be removed in a future version.',
        ),
    )
    // Register MCP subcommands
    .command(mcpCommand)
    // Register Voice subcommands
    .command(voiceCommand)
    // Ensure validation flows through .fail() for clean UX
    .fail((msg, err) => {
      if (err) throw err;
      throw new Error(msg);
    })
    .check((argv) => {
      // The 'query' positional can be a string (for one arg) or string[] (for multiple).
      // This guard safely checks if any positional argument was provided.
      const query = argv['query'] as string | string[] | undefined;
      const hasPositionalQuery = Array.isArray(query)
        ? query.length > 0
        : !!query;

      if (argv['prompt'] && hasPositionalQuery) {
        return 'Cannot use both a positional prompt and the --prompt (-p) flag together';
      }
      if (argv['prompt'] && argv['promptInteractive']) {
        return 'Cannot use both --prompt (-p) and --prompt-interactive (-i) together';
      }
      if (argv['yolo'] && argv['approvalMode']) {
        return 'Cannot use both --yolo (-y) and --approval-mode together. Use --approval-mode=yolo instead.';
      }
      if (
        argv['outputFormat'] &&
        !['text', 'json', 'stream-json'].includes(
          argv['outputFormat'] as string,
        )
      ) {
        return `Invalid values:\n  Argument: output-format, Given: "${argv['outputFormat']}", Choices: "text", "json", "stream-json"`;
      }
      if (argv['webRemoteToken'] && argv['webRemoteRotateToken']) {
        return 'Cannot use both --web-remote-token and --web-remote-rotate-token together.';
      }
      const remoteBind = argv['remoteBind'] as string | undefined;
      const webRemoteHost =
        remoteBind ?? (argv['webRemoteHost'] as string | undefined);
      if (
        remoteBind &&
        argv['webRemoteHost'] &&
        remoteBind !== argv['webRemoteHost']
      ) {
        return 'Cannot use both --remote-bind and --web-remote-host with different values.';
      }
      if (webRemoteHost && !isLoopbackHost(webRemoteHost) && !remoteBind) {
        return 'Binding web-remote to a non-loopback host requires --remote-bind';
      }
      return true;
    });

  if (settings?.experimental?.extensionManagement ?? true) {
    yargsInstance.command(extensionsCommand);
  }

  // Register hooks command if hooks are enabled
  if (settings?.tools?.enableHooks) {
    yargsInstance.command(hooksCommand);
  }

  yargsInstance
    .version(await getVersion()) // This will enable the --version flag based on package.json
    .alias('v', 'version')
    .help()
    .alias('h', 'help')
    .strict()
    .demandCommand(0, 0) // Allow base command to run with no subcommands
    .exitProcess(false);

  yargsInstance.wrap(yargsInstance.terminalWidth());
  let result;
  try {
    result = await yargsInstance.parse();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    debugLogger.error(msg);
    yargsInstance.showHelp();
    await runExitCleanup();
    process.exit(1);
  }

  if (result['remoteBind']) {
    result['webRemoteHost'] = result['remoteBind'];
  }

  // Handle help and version flags manually since we disabled exitProcess
  if (result['help'] || result['version']) {
    await runExitCleanup();
    process.exit(0);
  }

  // Normalize query args: handle both quoted "@path file" and unquoted @path file
  const queryArg = (result as { query?: string | string[] | undefined }).query;
  const q: string | undefined = Array.isArray(queryArg)
    ? queryArg.join(' ')
    : queryArg;

  // Route positional args: explicit -i flag -> interactive; else -> one-shot (even for @commands)
  if (q && !result['prompt']) {
    const hasExplicitInteractive =
      result['promptInteractive'] === '' || !!result['promptInteractive'];
    if (hasExplicitInteractive) {
      result['promptInteractive'] = q;
    } else {
      result['prompt'] = q;
    }
  }

  // Keep CliArgs.query as a string for downstream typing
  (result as Record<string, unknown>)['query'] = q || undefined;

  // The import format is now only controlled by settings.memoryImportFormat
  // We no longer accept it as a CLI argument
  return result as unknown as CliArgs;
}

/**
 * Creates a filter function to determine if a tool should be excluded.
 *
 * In non-interactive mode, we want to disable tools that require user
 * interaction to prevent the CLI from hanging. This function creates a predicate
 * that returns `true` if a tool should be excluded.
 *
 * A tool is excluded if it's not in the `allowedToolsSet`. The shell tool
 * has a special case: it's not excluded if any of its subcommands
 * are in the `allowedTools` list.
 *
 * @param allowedTools A list of explicitly allowed tool names.
 * @param allowedToolsSet A set of explicitly allowed tool names for quick lookups.
 * @returns A function that takes a tool name and returns `true` if it should be excluded.
 */
function createToolExclusionFilter(
  allowedTools: string[],
  allowedToolsSet: Set<string>,
) {
  return (tool: string): boolean => {
    if (tool === SHELL_TOOL_NAME) {
      // If any of the allowed tools is ShellTool (even with subcommands), don't exclude it.
      return !allowedTools.some((allowed) =>
        SHELL_TOOL_NAMES.some((shellName) => allowed.startsWith(shellName)),
      );
    }
    return !allowedToolsSet.has(tool);
  };
}

export function isDebugMode(argv: CliArgs): boolean {
  return (
    argv.debug ||
    [process.env['DEBUG'], process.env['DEBUG_MODE']].some(
      (v) => v === 'true' || v === '1',
    )
  );
}

export async function loadCliConfig(
  settings: Settings,
  sessionId: string,
  argv: CliArgs,
  cwd: string = process.cwd(),
): Promise<Config> {
  const debugMode = isDebugMode(argv);

  if (argv.sandbox) {
    process.env['TERMINAI_SANDBOX'] = 'true';
    process.env['GEMINI_SANDBOX'] = 'true';
  }

  const memoryImportFormat = settings.context?.importFormat || 'tree';

  const ideMode = settings.ide?.enabled ?? false;

  const folderTrust = settings.security?.folderTrust?.enabled ?? false;
  const trustedFolder = isWorkspaceTrusted(settings)?.isTrusted ?? true;

  // Set the context filename in the server's memoryTool module BEFORE loading memory
  // TODO(b/343434939): This is a bit of a hack. The contextFileName should ideally be passed
  // directly to the Config constructor in core, and have core handle setGeminiMdFilename.
  // However, loadHierarchicalGeminiMemory is called *before* createServerConfig.
  if (settings.context?.fileName) {
    setServerGeminiMdFilename(settings.context.fileName);
  } else {
    // Reset to default if not provided in settings.
    setServerGeminiMdFilename(getCurrentGeminiMdFilename());
  }

  const fileService = new FileDiscoveryService(cwd);

  const memoryFileFiltering = {
    ...DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
    ...settings.context?.fileFiltering,
  };

  const fileFiltering = {
    ...DEFAULT_FILE_FILTERING_OPTIONS,
    ...settings.context?.fileFiltering,
  };

  const includeDirectories = (settings.context?.includeDirectories || [])
    .map(resolvePath)
    .concat((argv.includeDirectories || []).map(resolvePath));

  const extensionManager = new ExtensionManager({
    settings,
    requestConsent: requestConsentNonInteractive,
    requestSetting: promptForSetting,
    workspaceDir: cwd,
    enabledExtensionOverrides: argv.extensions,
    eventEmitter: appEvents as unknown as EventEmitter<ExtensionEvents>,
  });
  await extensionManager.loadExtensions();

  const experimentalJitContext = settings.experimental?.jitContext ?? false;

  let memoryContent = '';
  let fileCount = 0;
  let filePaths: string[] = [];

  if (!experimentalJitContext) {
    // Call the (now wrapper) loadHierarchicalGeminiMemory which calls the server's version
    const result = await loadServerHierarchicalMemory(
      cwd,
      [],
      debugMode,
      fileService,
      extensionManager,
      trustedFolder,
      memoryImportFormat,
      memoryFileFiltering,
      settings.context?.discoveryMaxDirs,
    );
    memoryContent = result.memoryContent;
    fileCount = result.fileCount;
    filePaths = result.filePaths;
  }

  const question = argv.promptInteractive || argv.prompt || '';

  // Determine approval mode with backward compatibility
  let approvalMode: ApprovalMode;
  if (argv.approvalMode) {
    // New --approval-mode flag takes precedence
    switch (argv.approvalMode) {
      case 'yolo':
        approvalMode = ApprovalMode.YOLO;
        break;
      case 'auto_edit':
        approvalMode = ApprovalMode.AUTO_EDIT;
        break;
      case 'default':
        approvalMode = ApprovalMode.DEFAULT;
        break;
      default:
        throw new Error(
          `Invalid approval mode: ${argv.approvalMode}. Valid values are: yolo, auto_edit, default`,
        );
    }
  } else {
    // Fallback to legacy --yolo flag behavior
    approvalMode =
      argv.yolo || false ? ApprovalMode.YOLO : ApprovalMode.DEFAULT;
  }
  const voiceModeRequested =
    argv.voice !== undefined ? argv.voice : settings.voice?.enabled;
  if (voiceModeRequested && approvalMode === ApprovalMode.YOLO) {
    debugLogger.warn(
      'YOLO mode is disabled while voice mode is active for safety.',
    );
    approvalMode = ApprovalMode.DEFAULT;
  }

  // Override approval mode if disableYoloMode is set.
  if (settings.security?.disableYoloMode) {
    if (approvalMode === ApprovalMode.YOLO) {
      debugLogger.error('YOLO mode is disabled by the "disableYolo" setting.');
      throw new FatalConfigError(
        'Cannot start in YOLO mode when it is disabled by settings',
      );
    }
    approvalMode = ApprovalMode.DEFAULT;
  } else if (approvalMode === ApprovalMode.YOLO) {
    debugLogger.warn(
      'YOLO mode is enabled. All tool calls will be automatically approved.',
    );
  }

  // Force approval mode to default if the folder is not trusted.
  if (!trustedFolder && approvalMode !== ApprovalMode.DEFAULT) {
    debugLogger.warn(
      `Approval mode overridden to "default" because the current folder is not trusted.`,
    );
    approvalMode = ApprovalMode.DEFAULT;
  }

  let telemetrySettings;
  try {
    telemetrySettings = await resolveTelemetrySettings({
      env: process.env as unknown as Record<string, string | undefined>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      settings: settings.telemetry as any,
    });
  } catch (err) {
    if (err instanceof FatalConfigError) {
      throw new FatalConfigError(
        `Invalid telemetry configuration: ${err.message}.`,
      );
    }
    throw err;
  }

  const policyEngineConfig = await createPolicyEngineConfig(
    settings,
    approvalMode,
  );
  const policyBrainAuthority = await resolvePolicyBrainAuthority();

  const enableMessageBusIntegration =
    settings.tools?.enableMessageBusIntegration ?? true;

  const allowedTools = argv.allowedTools || settings.tools?.allowed || [];
  const allowedToolsSet = new Set(allowedTools);

  // Interactive mode: explicit -i flag or (TTY + no args + no -p flag)
  const hasQuery = !!argv.query;
  const interactive =
    !!argv.promptInteractive ||
    !!argv.experimentalAcp ||
    (process.stdin.isTTY && !hasQuery && !argv.prompt);
  // In non-interactive mode, exclude tools that require a prompt.
  const extraExcludes: string[] = [];
  if (!interactive) {
    const defaultExcludes = [
      SHELL_TOOL_NAME,
      EDIT_TOOL_NAME,
      WRITE_FILE_TOOL_NAME,
      WEB_FETCH_TOOL_NAME,
      REPL_TOOL_NAME,
    ];
    const autoEditExcludes = [SHELL_TOOL_NAME, REPL_TOOL_NAME];

    const toolExclusionFilter = createToolExclusionFilter(
      allowedTools,
      allowedToolsSet,
    );

    switch (approvalMode) {
      case ApprovalMode.DEFAULT:
        // In default non-interactive mode, all tools that require approval are excluded.
        extraExcludes.push(...defaultExcludes.filter(toolExclusionFilter));
        break;
      case ApprovalMode.AUTO_EDIT:
        // In auto-edit non-interactive mode, only tools that still require a prompt are excluded.
        extraExcludes.push(...autoEditExcludes.filter(toolExclusionFilter));
        break;
      case ApprovalMode.YOLO:
        // No extra excludes for YOLO mode.
        break;
      default:
        // This should never happen due to validation earlier, but satisfies the linter
        break;
    }
  }

  const excludeTools = mergeExcludeTools(
    settings,
    extensionManager.getExtensions(),
    extraExcludes.length > 0 ? extraExcludes : undefined,
  );

  const defaultModel = settings.general?.previewFeatures
    ? PREVIEW_GEMINI_MODEL_AUTO
    : DEFAULT_GEMINI_MODEL_AUTO;
  let resolvedModel: string =
    argv.model ||
    process.env['GEMINI_MODEL'] ||
    settings.model?.name ||
    defaultModel;

  const sandboxConfig = await loadSandboxConfig(settings, argv);
  const replDockerImage =
    settings.tools?.repl?.dockerImage ??
    process.env['TERMINAI_REPL_DOCKER_IMAGE'] ??
    process.env['GEMINI_REPL_DOCKER_IMAGE'] ??
    sandboxConfig?.image;
  const screenReader =
    argv.screenReader !== undefined
      ? argv.screenReader
      : (settings.ui?.accessibility?.screenReader ?? false);

  const ptyInfo = await getPty();

  // Pass full settings to settingsToProviderConfig for proper resolution
  const providerResult = settingsToProviderConfig(settings, {
    modelOverride: argv.model,
  });
  const providerConfig = providerResult.providerConfig;
  if (providerResult.resolvedModel) {
    resolvedModel = providerResult.resolvedModel;
  }

  const builder = new ConfigBuilder(sessionId);

  const overrides: Partial<ConfigParameters> = {
    embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL,
    sandbox: sandboxConfig,
    includeDirectories,
    loadMemoryFromIncludeDirectories:
      settings.context?.loadMemoryFromIncludeDirectories || false,
    previewMode: argv.preview ?? false,
    userMemory: memoryContent,
    geminiMdFileCount: fileCount,
    geminiMdFilePaths: filePaths,
    accessibility: {
      ...settings.ui?.accessibility,
      screenReader,
    },
    telemetry: telemetrySettings,
    model: resolvedModel, // Use the CLI-resolved model (respects --model)
    providerConfig, // Task 2.3: support runtime reconfigure
    experimentalZedIntegration: argv.experimentalAcp || false,
    listExtensions: argv.listExtensions || false,
    listSessions: argv.listSessions || false,
    deleteSession: argv.deleteSession,
    enabledExtensions: argv.extensions,
    extensionLoader: extensionManager,
    ideMode,
    interactive,
    trustedFolder,
    folderTrust,
    fileFiltering,
    policyEngineConfig,
    enableMessageBusIntegration,
    brain: {
      authority: policyBrainAuthority,
    },
    shellToolInactivityTimeout: settings.tools?.shell?.inactivityTimeout,
    shellExecutionConfig: {},
    repl: {
      sandboxTier: settings.tools?.repl?.sandboxTier as ReplSandboxTier,
      timeoutSeconds: settings.tools?.repl?.timeoutSeconds,
      dockerImage: replDockerImage,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventEmitter: appEvents as any,
    useSmartEdit: argv.useSmartEdit ?? settings.useSmartEdit,
    useWriteTodos: argv.useWriteTodos ?? settings.useWriteTodos,
    output: {
      format: (argv.outputFormat ?? settings.output?.format) as OutputFormat,
    },
    fakeResponses: argv.fakeResponses,
    recordResponses: argv.recordResponses,
    ptyInfo: ptyInfo?.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelConfigServiceConfig: settings.modelConfigs as any,
  };

  if (argv.allowedMcpServerNames) {
    overrides.allowedMcpServers = argv.allowedMcpServerNames;
    overrides.blockedMcpServers = [];
  }
  overrides.excludeTools = excludeTools;

  return builder.build({
    workspaceDir: cwd,
    question,
    approvalMode,
    overrides,
    settings,
  });
}

function mergeExcludeTools(
  settings: Settings,
  extensions: GeminiCLIExtension[] = [],
  extraExcludes?: string[] | undefined,
): string[] {
  const extensionExcludes = extensions
    .filter((e) => e.isActive)
    .flatMap((e) => e.excludeTools || []);

  const allExcludeTools = new Set([
    ...(settings.tools?.exclude || []),
    ...extensionExcludes,
    ...(extraExcludes || []),
  ]);
  return [...allExcludeTools];
}
