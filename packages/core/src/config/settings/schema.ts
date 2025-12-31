import type {
  MCPServerConfig,
  BugCommandSettings,
  AuthType,
} from '../../index.js';
import { GEMINI_MODEL_ALIAS_AUTO } from '../../index.js';
import type { SettingEnumOption, SettingsSchema } from './schema-types.js';
import { MergeStrategy } from './schema-types.js';
import type {
  CustomTheme,
  SessionRetentionSettings,
  DnsResolutionOrder,
} from './types.js';
import { DEFAULT_MIN_RETENTION } from './constants.js';

function oneLine(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += String(values[i]);
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * The canonical schema for all settings.
 * The structure of this object defines the structure of the `Settings` type.
 * `as const` is crucial for TypeScript to infer the most specific types possible.
 */
export const SETTINGS_SCHEMA = {
  telemetry: {
    type: 'object',
    label: 'Telemetry',
    category: 'Advanced',
    requiresRestart: false,
    default: {},
    description: 'Telemetry configuration.',
    showInDialog: false,
    properties: {
      enabled: {
        type: 'boolean',
        label: 'Enable Telemetry',
        category: 'Advanced',
        requiresRestart: false,
        default: true,
        showInDialog: true,
      },
      target: {
        type: 'enum',
        label: 'Telemetry Target',
        category: 'Advanced',
        requiresRestart: true,
        default: 'local',
        options: [
          { value: 'local', label: 'Local' }, // TelemetryTarget.LOCAL
          { value: 'gcp', label: 'GCP' }, // TelemetryTarget.GCP
        ],
        showInDialog: true,
      },
      otlpEndpoint: {
        type: 'string',
        label: 'OTLP Endpoint',
        category: 'Advanced',
        requiresRestart: true,
        default: undefined as string | undefined,
        showInDialog: true,
      },
      otlpProtocol: {
        type: 'enum',
        label: 'OTLP Protocol',
        category: 'Advanced',
        requiresRestart: true,
        default: 'http',
        options: [
          { value: 'http', label: 'HTTP' }, // 'http' matches interface
          { value: 'grpc', label: 'gRPC' },
        ],
        showInDialog: true,
      },
      logPrompts: {
        type: 'boolean',
        label: 'Log Prompts',
        category: 'Advanced',
        requiresRestart: false,
        default: false,
        showInDialog: true,
      },
      outfile: {
        type: 'string',
        label: 'Output File',
        category: 'Advanced',
        requiresRestart: true,
        default: undefined as string | undefined,
        showInDialog: true,
      },
      useCollector: {
        type: 'boolean',
        label: 'Use Collector',
        category: 'Advanced',
        requiresRestart: true,
        default: false,
        showInDialog: true,
      },
    },
  },

  modelConfigs: {
    type: 'object',
    label: 'Model Configurations',
    category: 'Model',
    requiresRestart: true,
    default: {},
    description: 'Specific configurations for models.',
    showInDialog: false,
  },

  ide: {
    type: 'object',
    label: 'IDE Integration',
    category: 'Advanced',
    requiresRestart: true,
    default: {},
    description: 'IDE integration settings.',
    showInDialog: false,
    properties: {
      enabled: {
        type: 'boolean',
        label: 'Enable IDE Mode',
        category: 'Advanced',
        requiresRestart: true,
        default: false,
        showInDialog: true,
      },
      hasSeenNudge: {
        type: 'boolean',
        label: 'Has Seen Nudge',
        category: 'Extensions',
        requiresRestart: false,
        default: false,
        description: 'Whether the user has seen the IDE integration nudge.',
        showInDialog: false,
      },
    },
  },

  context: {
    type: 'object',
    label: 'Context',
    category: 'Advanced',
    requiresRestart: false,
    default: {},
    description: 'Context and memory settings.',
    showInDialog: false,
    properties: {
      fileName: {
        type: 'string',
        label: 'Context File Name',
        category: 'Context',
        requiresRestart: false,
        default: undefined as string | string[] | undefined,
        ref: 'StringOrStringArray',
        description:
          'The name of the context file or files to load into memory. Accepts either a single string or an array of strings.',
        showInDialog: false,
      },
      importFormat: {
        type: 'enum',
        label: 'Import Format',
        category: 'Advanced',
        requiresRestart: false,
        default: 'tree',
        options: [
          { value: 'tree', label: 'Tree' },
          { value: 'flat', label: 'Flat' },
        ],
      },
      fileFiltering: {
        type: 'object',
        label: 'File Filtering',
        category: 'Advanced',
        requiresRestart: false,
        default: {},
        description: 'File filtering options.',
        showInDialog: false,
        properties: {
          disableFuzzySearch: {
            type: 'boolean',
            label: 'Disable Fuzzy Search',
            category: 'Advanced',
            requiresRestart: false,
            default: false,
          },
          respectGitIgnore: {
            type: 'boolean',
            label: 'Respect .gitignore',
            category: 'Advanced',
            requiresRestart: false,
            default: true,
          },
          respectGeminiIgnore: {
            type: 'boolean',
            label: 'Respect .geminiignore',
            category: 'Advanced',
            requiresRestart: false,
            default: true,
          },
          enableRecursiveFileSearch: {
            type: 'boolean',
            label: 'Recursive Search',
            category: 'Advanced',
            requiresRestart: false,
            default: true,
          },
        },
      },
      includeDirectories: {
        type: 'array',
        label: 'Include Directories',
        category: 'Advanced',
        requiresRestart: false,
        default: [] as string[],
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
      loadMemoryFromIncludeDirectories: {
        type: 'boolean',
        label: 'Load Memory from Included Directories',
        category: 'Advanced',
        requiresRestart: false,
        default: false,
      },
      discoveryMaxDirs: {
        type: 'number',
        label: 'Discovery Max Directories',
        category: 'Advanced',
        requiresRestart: false,
        default: 200,
      },
    },
  },

  llm: {
    type: 'object',
    label: 'LLM Configuration',
    category: 'Model',
    requiresRestart: true,
    default: {},
    description: 'LLM provider configuration.',
    showInDialog: false,
    properties: {
      provider: {
        type: 'enum',
        label: 'Provider',
        category: 'Model',
        requiresRestart: true,
        default: 'gemini',
        options: [
          { value: 'gemini', label: 'Gemini' },
          { value: 'openai_compatible', label: 'OpenAI Compatible' },
          { value: 'anthropic', label: 'Anthropic' },
        ],
        description: 'Select the LLM provider.',
        showInDialog: true,
      },
      headers: {
        type: 'object',
        label: 'Custom Headers',
        category: 'Model',
        requiresRestart: true,
        default: {},
        description: 'Custom headers for LLM requests.',
        showInDialog: false,
        additionalProperties: { type: 'string' },
      },
      openaiCompatible: {
        type: 'object',
        label: 'OpenAI Compatible Settings',
        category: 'Model',
        requiresRestart: true,
        default: {},
        description: 'Settings for OpenAI-compatible provider.',
        showInDialog: false,
        properties: {
          baseUrl: {
            type: 'string',
            label: 'Base URL',
            category: 'Model',
            requiresRestart: true,
            default: undefined as string | undefined,
            description: 'API Base URL.',
            showInDialog: true,
          },
          model: {
            type: 'string',
            label: 'Model ID',
            category: 'Model',
            requiresRestart: true,
            default: undefined as string | undefined,
            description: 'The model ID (e.g. gpt-4, llama-3).',
            showInDialog: true,
          },
          auth: {
            type: 'object',
            label: 'Authentication',
            category: 'Model',
            requiresRestart: true,
            default: {},
            description: 'Authentication settings.',
            showInDialog: false,
            properties: {
              type: {
                type: 'enum',
                label: 'Auth Type',
                category: 'Model',
                requiresRestart: true,
                default: 'none',
                options: [
                  { value: 'none', label: 'None' },
                  { value: 'api-key', label: 'API Key' },
                  { value: 'bearer', label: 'Bearer Token' },
                ],
                description: 'Authentication type.',
                showInDialog: true,
              },
              envVarName: {
                type: 'string',
                label: 'API Key Env Var',
                category: 'Model',
                requiresRestart: true,
                default: undefined as string | undefined,
                description:
                  'Name of the environment variable for the API key.',
                showInDialog: true,
              },
            },
          },
        },
      },
    },
  },

  model: {
    type: 'object',
    label: 'Model Selection',
    category: 'Model',
    requiresRestart: true,
    default: {},
    description: 'Select the primary model for completions.',
    showInDialog: false,
    properties: {
      name: {
        type: 'string',
        label: 'Model Name',
        category: 'Model',
        requiresRestart: true,
        default: GEMINI_MODEL_ALIAS_AUTO as string,
        description:
          'The name of the model to use (e.g. gemini-1.5-pro, pro, auto).',
        showInDialog: true,
      },
      summarizeToolOutput: {
        type: 'object',
        label: 'Summarize Tool Output',
        category: 'Model',
        requiresRestart: false,
        default: undefined as
          | Record<string, { tokenBudget?: number }>
          | undefined,
        description: oneLine`
          Enables or disables summarization of tool output.
          Configure per-tool token budgets (for example {"run_shell_command": {"tokenBudget": 2000}}).
          Currently only the run_shell_command tool supports summarization.
        `,
        showInDialog: false,
        additionalProperties: {
          type: 'object',
          description:
            'Per-tool summarization settings with an optional tokenBudget.',
          ref: 'SummarizeToolOutputSettings',
        },
      },
      compressionThreshold: {
        type: 'number',
        label: 'Compression Threshold',
        category: 'Model',
        requiresRestart: true,
        default: 0.5 as number,
        description:
          'The fraction of context usage at which to trigger context compression (e.g. 0.2, 0.3).',
        showInDialog: true,
      },
      skipNextSpeakerCheck: {
        type: 'boolean',
        label: 'Skip Next Speaker Check',
        category: 'Advanced',
        requiresRestart: false,
        default: false,
        description:
          'Experimental: Skip the internal check for the next speaker in multi-turn conversations.',
        showInDialog: true,
      },
      maxSessionTurns: {
        type: 'number',
        label: 'Max Session Turns',
        category: 'Advanced',
        requiresRestart: false,
        default: -1,
        description: 'Maximum number of turns in a session (-1 for unlimited).',
        showInDialog: true,
      },
    },
  },

  brain: {
    type: 'object',
    label: 'Brain',
    category: 'Model',
    requiresRestart: false,
    default: {},
    description: 'Special model authority configuration.',
    showInDialog: false,
    properties: {
      authority: {
        type: 'enum',
        label: 'Brain Authority',
        category: 'Security',
        requiresRestart: true,
        default: 'escalate-only',
        options: [
          { value: 'escalate-only', label: 'Escalate Only' },
          { value: 'advisory', label: 'Advisory' },
          { value: 'governing', label: 'Governing' },
        ],
        description:
          'Controls how much the brain can raise approval review levels.',
        showInDialog: true,
      },
    },
  },

  // Maintained for compatibility/criticality
  mcpServers: {
    type: 'object',
    label: 'MCP Servers',
    category: 'Advanced',
    requiresRestart: true,
    default: {} as Record<string, MCPServerConfig>,
    description: 'Configuration for MCP servers.',
    showInDialog: false,
    mergeStrategy: MergeStrategy.SHALLOW_MERGE,
    additionalProperties: {
      type: 'object',
      ref: 'MCPServerConfig',
    },
  },

  general: {
    type: 'object',
    label: 'General',
    category: 'General',
    requiresRestart: false,
    default: {},
    description: 'General application settings.',
    showInDialog: false,
    properties: {
      previewFeatures: {
        type: 'boolean',
        label: 'Preview Features (e.g., models)',
        category: 'General',
        requiresRestart: false,
        default: false,
        description: 'Enable preview features (e.g., preview models).',
        showInDialog: true,
      },
      preferredEditor: {
        type: 'string',
        label: 'Preferred Editor',
        category: 'General',
        requiresRestart: false,
        default: undefined as string | undefined,
        description: 'The preferred editor to open files in.',
        showInDialog: false,
      },
      vimMode: {
        type: 'boolean',
        label: 'Vim Mode',
        category: 'General',
        requiresRestart: false,
        default: false,
        description: 'Enable Vim keybindings',
        showInDialog: true,
      },
      disableAutoUpdate: {
        type: 'boolean',
        label: 'Disable Auto Update',
        category: 'General',
        requiresRestart: false,
        default: false,
        description: 'Disable automatic updates',
        showInDialog: true,
      },
      disableUpdateNag: {
        type: 'boolean',
        label: 'Disable Update Nag',
        category: 'General',
        requiresRestart: false,
        default: false,
        description: 'Disable update notification prompts.',
        showInDialog: false,
      },
      checkpointing: {
        type: 'object',
        label: 'Checkpointing',
        category: 'General',
        requiresRestart: true,
        default: {},
        description: 'Session checkpointing settings.',
        showInDialog: false,
        properties: {
          enabled: {
            type: 'boolean',
            label: 'Enable Checkpointing',
            category: 'General',
            requiresRestart: true,
            default: false,
            description: 'Enable session checkpointing for recovery',
            showInDialog: false,
          },
        },
      },
      enablePromptCompletion: {
        type: 'boolean',
        label: 'Enable Prompt Completion',
        category: 'General',
        requiresRestart: true,
        default: false,
        description:
          'Enable AI-powered prompt completion suggestions while typing.',
        showInDialog: true,
      },
      retryFetchErrors: {
        type: 'boolean',
        label: 'Retry Fetch Errors',
        category: 'General',
        requiresRestart: false,
        default: false,
        description:
          'Retry on "exception TypeError: fetch failed sending request" errors.',
        showInDialog: false,
      },
      debugKeystrokeLogging: {
        type: 'boolean',
        label: 'Debug Keystroke Logging',
        category: 'General',
        requiresRestart: false,
        default: false,
        description: 'Enable debug logging of keystrokes to the console.',
        showInDialog: true,
      },
      sessionRetention: {
        type: 'object',
        label: 'Session Retention',
        category: 'General',
        requiresRestart: false,
        default: undefined as SessionRetentionSettings | undefined,
        showInDialog: false,
        properties: {
          enabled: {
            type: 'boolean',
            label: 'Enable Session Cleanup',
            category: 'General',
            requiresRestart: false,
            default: false,
            description: 'Enable automatic session cleanup',
            showInDialog: true,
          },
          maxAge: {
            type: 'string',
            label: 'Max Session Age',
            category: 'General',
            requiresRestart: false,
            default: undefined as string | undefined,
            description:
              'Maximum age of sessions to keep (e.g., "30d", "7d", "24h", "1w")',
            showInDialog: false,
          },
          maxCount: {
            type: 'number',
            label: 'Max Session Count',
            category: 'General',
            requiresRestart: false,
            default: undefined as number | undefined,
            description:
              'Alternative: Maximum number of sessions to keep (most recent)',
            showInDialog: false,
          },
          minRetention: {
            type: 'string',
            label: 'Min Retention Period',
            category: 'General',
            requiresRestart: false,
            default: DEFAULT_MIN_RETENTION as string,
            description: `Minimum retention period (safety limit, defaults to "${DEFAULT_MIN_RETENTION}")`,
            showInDialog: false,
          },
        },
        description: 'Settings for automatic session cleanup.',
      },
    },
  },
  output: {
    type: 'object',
    label: 'Output',
    category: 'General',
    requiresRestart: false,
    default: {},
    description: 'Settings for the CLI output.',
    showInDialog: false,
    properties: {
      format: {
        type: 'enum',
        label: 'Output Format',
        category: 'General',
        requiresRestart: false,
        default: 'text',
        description: 'The format of the CLI output.',
        showInDialog: true,
        options: [
          { value: 'text', label: 'Text' },
          { value: 'json', label: 'JSON' },
        ],
      },
    },
  },

  ui: {
    type: 'object',
    label: 'UI',
    category: 'UI',
    requiresRestart: false,
    default: {},
    description: 'User interface settings.',
    showInDialog: false,
    properties: {
      theme: {
        type: 'string',
        label: 'Theme',
        category: 'UI',
        requiresRestart: false,
        default: undefined as string | undefined,
        description:
          'The color theme for the UI. See the CLI themes guide for available options.',
        showInDialog: false,
      },
      customThemes: {
        type: 'object',
        label: 'Custom Themes',
        category: 'UI',
        requiresRestart: false,
        default: {} as Record<string, CustomTheme>,
        description: 'Custom theme definitions.',
        showInDialog: false,
        additionalProperties: {
          type: 'object',
          ref: 'CustomTheme',
        },
      },
      hideWindowTitle: {
        type: 'boolean',
        label: 'Hide Window Title',
        category: 'UI',
        requiresRestart: true,
        default: false,
        description: 'Hide the window title bar',
        showInDialog: true,
      },
      showStatusInTitle: {
        type: 'boolean',
        label: 'Show Status in Title',
        category: 'UI',
        requiresRestart: false,
        default: false,
        description:
          'Show Gemini CLI status and thoughts in the terminal window title',
        showInDialog: true,
      },
      hideTips: {
        type: 'boolean',
        label: 'Hide Tips',
        category: 'UI',
        requiresRestart: false,
        default: false,
        description: 'Hide helpful tips in the UI',
        showInDialog: true,
      },
      hideBanner: {
        type: 'boolean',
        label: 'Hide Banner',
        category: 'UI',
        requiresRestart: false,
        default: false,
        description: 'Hide the application banner',
        showInDialog: true,
      },
      hideContextSummary: {
        type: 'boolean',
        label: 'Hide Context Summary',
        category: 'UI',
        requiresRestart: false,
        default: false,
        description:
          'Hide the context summary (terminaI.md, MCP servers) above the input.',
        showInDialog: true,
      },
      footer: {
        type: 'object',
        label: 'Footer',
        category: 'UI',
        requiresRestart: false,
        default: {},
        description: 'Settings for the footer.',
        showInDialog: false,
        properties: {
          hideCWD: {
            type: 'boolean',
            label: 'Hide CWD',
            category: 'UI',
            requiresRestart: false,
            default: false,
            description:
              'Hide the current working directory path in the footer.',
            showInDialog: true,
          },
          hideSandboxStatus: {
            type: 'boolean',
            label: 'Hide Sandbox Status',
            category: 'UI',
            requiresRestart: false,
            default: false,
            description: 'Hide the sandbox status indicator in the footer.',
            showInDialog: true,
          },
          hideModelInfo: {
            type: 'boolean',
            label: 'Hide Model Info',
            category: 'UI',
            requiresRestart: false,
            default: false,
            description: 'Hide the model name and context usage in the footer.',
            showInDialog: true,
          },
          hideContextPercentage: {
            type: 'boolean',
            label: 'Hide Context Window Percentage',
            category: 'UI',
            requiresRestart: false,
            default: true,
            description: 'Hides the context window remaining percentage.',
            showInDialog: true,
          },
        },
      },
      hideFooter: {
        type: 'boolean',
        label: 'Hide Footer',
        category: 'UI',
        requiresRestart: false,
        default: false,
        description: 'Hide the footer from the UI',
        showInDialog: true,
      },
      showMemoryUsage: {
        type: 'boolean',
        label: 'Show Memory Usage',
        category: 'UI',
        requiresRestart: false,
        default: false,
        description: 'Display memory usage information in the UI',
        showInDialog: true,
      },
      showLineNumbers: {
        type: 'boolean',
        label: 'Show Line Numbers',
        category: 'UI',
        requiresRestart: false,
        default: true,
        description: 'Show line numbers in the chat.',
        showInDialog: true,
      },
      showCitations: {
        type: 'boolean',
        label: 'Show Citations',
        category: 'UI',
        requiresRestart: false,
        default: false,
        description: 'Show citations for generated text in the chat.',
        showInDialog: true,
      },
      showModelInfoInChat: {
        type: 'boolean',
        label: 'Show Model Info In Chat',
        category: 'UI',
        requiresRestart: false,
        default: false,
        description: 'Show the model name in the chat for each model turn.',
        showInDialog: true,
      },
      useFullWidth: {
        type: 'boolean',
        label: 'Use Full Width',
        category: 'UI',
        requiresRestart: false,
        default: true,
        description: 'Use the entire width of the terminal for output.',
        showInDialog: true,
      },
      useAlternateBuffer: {
        type: 'boolean',
        label: 'Use Alternate Screen Buffer',
        category: 'UI',
        requiresRestart: true,
        default: false,
        description:
          'Use an alternate screen buffer for the UI, preserving shell history.',
        showInDialog: true,
      },
      incrementalRendering: {
        type: 'boolean',
        label: 'Incremental Rendering',
        category: 'UI',
        requiresRestart: true,
        default: true,
        description:
          'Enable incremental rendering for the UI. This option will reduce flickering but may cause rendering artifacts. Only supported when useAlternateBuffer is enabled.',
        showInDialog: true,
      },
      customWittyPhrases: {
        type: 'array',
        label: 'Custom Witty Phrases',
        category: 'UI',
        requiresRestart: false,
        default: [] as string[],
        description: oneLine`
          Custom witty phrases to display during loading.
          When provided, the CLI cycles through these instead of the defaults.
        `,
        showInDialog: false,
        items: { type: 'string' },
      },
      accessibility: {
        type: 'object',
        label: 'Accessibility',
        category: 'UI',
        requiresRestart: true,
        default: {},
        description: 'Accessibility settings.',
        showInDialog: false,
        properties: {
          disableLoadingPhrases: {
            type: 'boolean',
            label: 'Disable Loading Phrases',
            category: 'UI',
            requiresRestart: true,
            default: false,
            description: 'Disable loading phrases for accessibility',
            showInDialog: true,
          },
          screenReader: {
            type: 'boolean',
            label: 'Screen Reader Mode',
            category: 'UI',
            requiresRestart: true,
            default: false,
            description:
              'Render output in plain-text to be more screen reader accessible',
            showInDialog: true,
          },
        },
      },
    },
  },

  voice: {
    type: 'object',
    label: 'Voice',
    category: 'Voice',
    requiresRestart: false,
    default: {},
    description: 'Voice mode settings.',
    showInDialog: false,
    properties: {
      enabled: {
        type: 'boolean',
        label: 'Enable Voice Mode',
        category: 'Voice',
        requiresRestart: false,
        default: false,
        description: 'Enable push-to-talk voice mode.',
        showInDialog: false,
      },
      pushToTalk: {
        type: 'object',
        label: 'Push-to-Talk',
        category: 'Voice',
        requiresRestart: false,
        default: {},
        description: 'Push-to-talk key settings.',
        showInDialog: false,
        properties: {
          key: {
            type: 'enum',
            label: 'Push-to-Talk Key',
            category: 'Voice',
            requiresRestart: false,
            default: 'space',
            description: 'Key binding for push-to-talk.',
            showInDialog: false,
            options: [
              { value: 'space', label: 'Space' },
              { value: 'ctrl+space', label: 'Ctrl+Space' },
            ],
          },
        },
      },
      spokenReply: {
        type: 'object',
        label: 'Spoken Reply',
        category: 'Voice',
        requiresRestart: false,
        default: {},
        description: 'Spoken reply settings.',
        showInDialog: false,
        properties: {
          maxWords: {
            type: 'number',
            label: 'Max Words',
            category: 'Voice',
            requiresRestart: false,
            default: 30,
            description: 'Maximum words to speak in voice replies.',
            showInDialog: false,
          },
        },
      },
      stt: {
        type: 'object',
        label: 'Speech-to-Text',
        category: 'Voice',
        requiresRestart: false,
        default: {},
        description: 'Speech-to-text provider settings.',
        showInDialog: false,
        properties: {
          provider: {
            type: 'enum',
            label: 'STT Provider',
            category: 'Voice',
            requiresRestart: false,
            default: 'auto',
            description: 'Speech-to-text provider.',
            showInDialog: false,
            options: [
              { value: 'auto', label: 'Auto' },
              { value: 'whispercpp', label: 'whisper.cpp' },
              { value: 'none', label: 'None' },
            ],
          },
          whispercpp: {
            type: 'object',
            label: 'whisper.cpp',
            category: 'Voice',
            requiresRestart: false,
            default: {},
            description: 'whisper.cpp configuration overrides.',
            showInDialog: false,
            properties: {
              binaryPath: {
                type: 'string',
                label: 'Binary Path',
                category: 'Voice',
                requiresRestart: false,
                default: undefined as string | undefined,
                description: 'Override path to the whisper.cpp binary.',
                showInDialog: false,
              },
              modelPath: {
                type: 'string',
                label: 'Model Path',
                category: 'Voice',
                requiresRestart: false,
                default: undefined as string | undefined,
                description: 'Override path to the whisper.cpp model file.',
                showInDialog: false,
              },
              device: {
                type: 'string',
                label: 'Input Device',
                category: 'Voice',
                requiresRestart: false,
                default: undefined as string | undefined,
                description:
                  'Optional microphone device name to pass to the recorder.',
                showInDialog: false,
              },
            },
          },
        },
      },
      tts: {
        type: 'object',
        label: 'Text-to-Speech',
        category: 'Voice',
        requiresRestart: false,
        default: {},
        description: 'Text-to-speech provider settings.',
        showInDialog: false,
        properties: {
          provider: {
            type: 'enum',
            label: 'TTS Provider',
            category: 'Voice',
            requiresRestart: false,
            default: 'auto',
            description: 'Text-to-speech provider.',
            showInDialog: false,
            options: [
              { value: 'auto', label: 'Auto' },
              { value: 'openai', label: 'OpenAI' },
              { value: 'elevenlabs', label: 'ElevenLabs' },
              { value: 'none', label: 'None' },
            ],
          },
          voice: {
            type: 'string',
            label: 'Voice ID',
            category: 'Voice',
            requiresRestart: false,
            default: undefined as string | undefined,
            description: 'The voice ID to use for TTS.',
            showInDialog: false,
          },
        },
      },
    },
  },

  mcp: {
    type: 'object',
    label: 'MCP',
    category: 'MCP',
    requiresRestart: true,
    default: {},
    description: 'Settings for Model Context Protocol (MCP) servers.',
    showInDialog: false,
    properties: {
      serverCommand: {
        type: 'string',
        label: 'MCP Server Command',
        category: 'MCP',
        requiresRestart: true,
        default: undefined as string | undefined,
        description: 'Command to start an MCP server.',
        showInDialog: false,
      },
      allowed: {
        type: 'array',
        label: 'Allow MCP Servers',
        category: 'MCP',
        requiresRestart: true,
        default: undefined as string[] | undefined,
        description: 'A list of MCP servers to allow.',
        showInDialog: false,
        items: { type: 'string' },
      },
      excluded: {
        type: 'array',
        label: 'Exclude MCP Servers',
        category: 'MCP',
        requiresRestart: true,
        default: undefined as string[] | undefined,
        description: 'A list of MCP servers to exclude.',
        showInDialog: false,
        items: { type: 'string' },
      },
    },
  },
  useSmartEdit: {
    type: 'boolean',
    label: 'Use Smart Edit',
    category: 'Advanced',
    requiresRestart: false,
    default: true,
    description: 'Enable the smart-edit tool instead of the replace tool.',
    showInDialog: false,
  },
  useWriteTodos: {
    type: 'boolean',
    label: 'Use WriteTodos',
    category: 'Advanced',
    requiresRestart: false,
    default: true,
    description: 'Enable the write_todos tool.',
    showInDialog: false,
  },
  security: {
    type: 'object',
    label: 'Security',
    category: 'Security',
    requiresRestart: true,
    default: {},
    description: 'Security-related settings.',
    showInDialog: false,
    properties: {
      disableYoloMode: {
        type: 'boolean',
        label: 'Disable YOLO Mode',
        category: 'Security',
        requiresRestart: true,
        default: false,
        description: 'Disable YOLO mode, even if enabled by a flag.',
        showInDialog: true,
      },
      enablePermanentToolApproval: {
        type: 'boolean',
        label: 'Allow Permanent Tool Approval',
        category: 'Security',
        requiresRestart: false,
        default: false,
        description:
          'Enable the "Allow for all future sessions" option in tool confirmation dialogs.',
        showInDialog: true,
      },
      blockGitExtensions: {
        type: 'boolean',
        label: 'Blocks extensions from Git',
        category: 'Security',
        requiresRestart: true,
        default: false,
        description: 'Blocks installing and loading extensions from Git.',
        showInDialog: true,
      },
      folderTrust: {
        type: 'object',
        label: 'Folder Trust',
        category: 'Security',
        requiresRestart: false,
        default: {},
        description: 'Settings for folder trust.',
        showInDialog: false,
        properties: {
          enabled: {
            type: 'boolean',
            label: 'Folder Trust',
            category: 'Security',
            requiresRestart: true,
            default: false,
            description: 'Setting to track whether Folder trust is enabled.',
            showInDialog: true,
          },
        },
      },
      auth: {
        type: 'object',
        label: 'Authentication',
        category: 'Security',
        requiresRestart: true,
        default: {},
        description: 'Authentication settings.',
        showInDialog: false,
        properties: {
          selectedType: {
            type: 'string',
            label: 'Selected Auth Type',
            category: 'Security',
            requiresRestart: true,
            default: undefined as AuthType | undefined,
            description: 'The currently selected authentication type.',
            showInDialog: false,
          },
          enforcedType: {
            type: 'string',
            label: 'Enforced Auth Type',
            category: 'Advanced',
            requiresRestart: true,
            default: undefined as AuthType | undefined,
            description:
              'The required auth type. If this does not match the selected auth type, the user will be prompted to re-authenticate.',
            showInDialog: false,
          },
          useExternal: {
            type: 'boolean',
            label: 'Use External Auth',
            category: 'Security',
            requiresRestart: true,
            default: undefined as boolean | undefined,
            description: 'Whether to use an external authentication flow.',
            showInDialog: false,
          },
        },
      },
    },
  },

  audit: {
    type: 'object',
    label: 'Audit',
    category: 'Security',
    requiresRestart: true,
    default: {},
    description: 'Audit logging configuration (cannot be disabled).',
    showInDialog: false,
    properties: {
      redactUiTypedText: {
        type: 'boolean',
        label: 'Redact UI typed text',
        category: 'Security',
        requiresRestart: true,
        default: true,
        description:
          'Redact UI typed text in audit logs. Audit logging cannot be disabled.',
        showInDialog: true,
      },
      retentionDays: {
        type: 'number',
        label: 'Audit retention (days)',
        category: 'Security',
        requiresRestart: true,
        default: 30,
        description: 'Retention window for audit logs (metadata only).',
        showInDialog: false,
      },
      export: {
        type: 'object',
        label: 'Audit export',
        category: 'Security',
        requiresRestart: false,
        default: {},
        description: 'Export options for audit logs.',
        showInDialog: false,
        properties: {
          format: {
            type: 'enum',
            label: 'Export format',
            category: 'Security',
            requiresRestart: false,
            default: 'jsonl',
            options: [
              { value: 'jsonl', label: 'JSONL' },
              { value: 'json', label: 'JSON' },
            ],
            description: 'Format to use when exporting audit logs.',
            showInDialog: true,
          },
          redaction: {
            type: 'enum',
            label: 'Export redaction level',
            category: 'Security',
            requiresRestart: false,
            default: 'enterprise',
            options: [
              { value: 'enterprise', label: 'Enterprise (metadata only)' },
              { value: 'debug', label: 'Debug' },
            ],
            description:
              'Export redaction. Enterprise removes payloads; debug keeps more detail.',
            showInDialog: true,
          },
        },
      },
    },
  },

  recipes: {
    type: 'object',
    label: 'Recipes',
    category: 'Automation',
    requiresRestart: true,
    default: {},
    description:
      'Governed recipes configuration. Built-ins are always enabled; community recipes require confirmation.',
    showInDialog: false,
    properties: {
      paths: {
        type: 'array',
        label: 'Recipe directories',
        category: 'Automation',
        requiresRestart: true,
        default: [] as string[],
        description:
          'Additional directories to load user-authored recipes from.',
        showInDialog: false,
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
      communityPaths: {
        type: 'array',
        label: 'Community recipe directories',
        category: 'Automation',
        requiresRestart: true,
        default: [] as string[],
        description:
          'Directories containing community recipes. These require confirmation before first use.',
        showInDialog: false,
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
      allowCommunity: {
        type: 'boolean',
        label: 'Allow community recipes',
        category: 'Automation',
        requiresRestart: true,
        default: false,
        description:
          'Enable loading community recipes. Community recipes still require first-load confirmation.',
        showInDialog: true,
      },
      confirmCommunityOnFirstLoad: {
        type: 'boolean',
        label: 'Confirm community recipes on first load',
        category: 'Automation',
        requiresRestart: true,
        default: true,
        description:
          'When enabled, the CLI will ask for confirmation the first time a community recipe is encountered.',
        showInDialog: true,
      },
      trustedCommunityRecipes: {
        type: 'array',
        label: 'Trusted community recipes',
        category: 'Automation',
        requiresRestart: true,
        default: [] as string[],
        description:
          'Recipe IDs that have already been confirmed. These will not prompt again.',
        showInDialog: false,
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
    },
  },

  advanced: {
    type: 'object',
    label: 'Advanced',
    category: 'Advanced',
    requiresRestart: true,
    default: {},
    description: 'Advanced settings for power users.',
    showInDialog: false,
    properties: {
      autoConfigureMemory: {
        type: 'boolean',
        label: 'Auto Configure Max Old Space Size',
        category: 'Advanced',
        requiresRestart: true,
        default: false,
        description: 'Automatically configure Node.js memory limits',
        showInDialog: false,
      },
      dnsResolutionOrder: {
        type: 'string',
        label: 'DNS Resolution Order',
        category: 'Advanced',
        requiresRestart: true,
        default: undefined as DnsResolutionOrder | undefined,
        description: 'The DNS resolution order.',
        showInDialog: false,
      },
      excludedEnvVars: {
        type: 'array',
        label: 'Excluded Project Environment Variables',
        category: 'Advanced',
        requiresRestart: false,
        default: ['DEBUG', 'DEBUG_MODE'] as string[],
        description: 'Environment variables to exclude from project context.',
        showInDialog: false,
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
      bugCommand: {
        type: 'object',
        label: 'Bug Command',
        category: 'Advanced',
        requiresRestart: false,
        default: undefined as BugCommandSettings | undefined,
        description: 'Configuration for the bug report command.',
        showInDialog: false,
        ref: 'BugCommandSettings',
      },
    },
  },

  experimental: {
    type: 'object',
    label: 'Experimental',
    category: 'Experimental',
    requiresRestart: true,
    default: {},
    description: 'Setting to enable experimental features',
    showInDialog: false,
    properties: {
      enableAgents: {
        type: 'boolean',
        label: 'Enable Agents',
        category: 'Experimental',
        requiresRestart: true,
        default: false,
        description:
          'Enable local and remote subagents. Warning: Experimental feature, uses YOLO mode for subagents',
        showInDialog: false,
      },
      extensionManagement: {
        type: 'boolean',
        label: 'Extension Management',
        category: 'Experimental',
        requiresRestart: true,
        default: true,
        description: 'Enable extension management features.',
        showInDialog: false,
      },
      extensionReloading: {
        type: 'boolean',
        label: 'Extension Reloading',
        category: 'Experimental',
        requiresRestart: true,
        default: false,
        description:
          'Enables extension loading/unloading within the CLI session.',
        showInDialog: false,
      },
      jitContext: {
        type: 'boolean',
        label: 'JIT Context Loading',
        category: 'Experimental',
        requiresRestart: true,
        default: false,
        description: 'Enable Just-In-Time (JIT) context loading.',
        showInDialog: false,
      },
      codebaseInvestigatorSettings: {
        type: 'object',
        label: 'Codebase Investigator Settings',
        category: 'Experimental',
        requiresRestart: true,
        default: {},
        description: 'Configuration for Codebase Investigator.',
        showInDialog: false,
        properties: {
          enabled: {
            type: 'boolean',
            label: 'Enable Codebase Investigator',
            category: 'Experimental',
            requiresRestart: true,
            default: true,
            description: 'Enable the Codebase Investigator agent.',
            showInDialog: true,
          },
          maxNumTurns: {
            type: 'number',
            label: 'Codebase Investigator Max Num Turns',
            category: 'Experimental',
            requiresRestart: true,
            default: 10,
            description:
              'Maximum number of turns for the Codebase Investigator agent.',
            showInDialog: true,
          },
          maxTimeMinutes: {
            type: 'number',
            label: 'Max Time (Minutes)',
            category: 'Experimental',
            requiresRestart: true,
            default: 3,
            description:
              'Maximum time for the Codebase Investigator agent (in minutes).',
            showInDialog: false,
          },
          thinkingBudget: {
            type: 'number',
            label: 'Thinking Budget',
            category: 'Experimental',
            requiresRestart: true,
            default: 8192,
            description:
              'The thinking budget for the Codebase Investigator agent.',
            showInDialog: false,
          },
          model: {
            type: 'string',
            label: 'Model',
            category: 'Experimental',
            requiresRestart: true,
            default: GEMINI_MODEL_ALIAS_AUTO,
            description:
              'The model to use for the Codebase Investigator agent.',
            showInDialog: false,
          },
        },
      },
      introspectionAgentSettings: {
        type: 'object',
        label: 'Introspection Agent Settings',
        category: 'Experimental',
        requiresRestart: true,
        default: {},
        description: 'Configuration for Introspection Agent.',
        showInDialog: false,
        properties: {
          enabled: {
            type: 'boolean',
            label: 'Enable Introspection Agent',
            category: 'Experimental',
            requiresRestart: true,
            default: false,
            description: 'Enable the Introspection Agent.',
            showInDialog: true,
          },
        },
      },
    },
  },

  logs: {
    type: 'object',
    label: 'Logs',
    category: 'General',
    requiresRestart: false,
    default: {},
    description: 'Session logging and retention settings.',
    showInDialog: true,
    properties: {
      retention: {
        type: 'object',
        label: 'Retention',
        category: 'General',
        requiresRestart: false,
        default: {},
        description: 'Log retention settings.',
        showInDialog: true,
        properties: {
          days: {
            type: 'number',
            label: 'Retention Days',
            category: 'General',
            requiresRestart: false,
            default: 7,
            description: 'Number of days to keep session logs.',
            showInDialog: true,
          },
        },
      },
    },
  },

  extensions: {
    type: 'object',
    label: 'Extensions',
    category: 'Extensions',
    requiresRestart: true,
    default: {},
    description: 'Settings for extensions.',
    showInDialog: false,
    properties: {
      disabled: {
        type: 'array',
        label: 'Disabled Extensions',
        category: 'Extensions',
        requiresRestart: true,
        default: [] as string[],
        description: 'List of disabled extensions.',
        showInDialog: false,
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
      workspacesWithMigrationNudge: {
        type: 'array',
        label: 'Workspaces with Migration Nudge',
        category: 'Extensions',
        requiresRestart: false,
        default: [] as string[],
        description:
          'List of workspaces for which the migration nudge has been shown.',
        showInDialog: false,
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
    },
  },

  tools: {
    type: 'object',
    label: 'Tools',
    category: 'Tools',
    requiresRestart: false,
    default: {},
    description: 'Configuration for tools.',
    showInDialog: false,
    properties: {
      useRipgrep: {
        type: 'boolean',
        label: 'Use Ripgrep',
        category: 'Advanced',
        requiresRestart: false,
        default: true,
        description: 'Use ripgrep for file searching if available.',
        showInDialog: true,
      },
      shell: {
        type: 'object',
        label: 'Shell',
        category: 'Tools',
        requiresRestart: false,
        default: {},
        description: 'Shell tool settings.',
        showInDialog: false,
        properties: {
          enableInteractiveShell: {
            type: 'boolean',
            label: 'Enable Interactive Shell',
            category: 'Tools',
            requiresRestart: false,
            default: true,
            description: 'Allow interactive shell sessions.',
            showInDialog: true,
          },
          pager: {
            type: 'string',
            label: 'Pager',
            category: 'Tools',
            requiresRestart: false,
            default: 'cat' as string,
            description:
              'The pager command to use for shell output. Defaults to `cat`.',
            showInDialog: false,
          },
          inactivityTimeout: {
            type: 'number',
            label: 'Inactivity Timeout',
            category: 'Tools',
            requiresRestart: false,
            default: 300,
            description: 'Timeout in seconds for inactive shell sessions.',
            showInDialog: true,
          },
          showColor: {
            type: 'boolean',
            label: 'Show Color',
            category: 'Tools',
            requiresRestart: false,
            default: true,
            description: 'Enable color output in shell.',
            showInDialog: true,
          },
        },
      },
      truncateToolOutputThreshold: {
        type: 'number',
        label: 'Truncate Threshold',
        category: 'Advanced',
        requiresRestart: false,
        default: 4000000 as number,
        description: 'Threshold for truncating tool output (characters).',
        showInDialog: true,
      },
      truncateToolOutputLines: {
        type: 'number',
        label: 'Truncate Lines',
        category: 'Advanced',
        requiresRestart: false,
        default: 1000 as number,
        description: 'Number of lines to keep when truncating.',
        showInDialog: true,
      },
      enableToolOutputTruncation: {
        type: 'boolean',
        label: 'Enable Truncation',
        category: 'Advanced',
        requiresRestart: false,
        default: true,
        description: 'Automatically truncate very large tool outputs.',
        showInDialog: true,
      },
      sandbox: {
        type: 'string',
        label: 'Sandbox',
        category: 'Tools',
        requiresRestart: true,
        default: undefined as boolean | string | undefined,
        ref: 'BooleanOrString',
        description: 'Sandbox execution environment.',
        showInDialog: false,
      },
      autoAccept: {
        type: 'boolean',
        label: 'Auto Accept',
        category: 'Tools',
        requiresRestart: false,
        default: false,
        description: 'Automatically accept safe tool calls.',
        showInDialog: true,
      },
      core: {
        type: 'array',
        label: 'Core Tools',
        category: 'Tools',
        requiresRestart: true,
        default: undefined as string[] | undefined,
        items: { type: 'string' },
        description: 'Restrict built-in tools.',
        showInDialog: false,
      },
      repl: {
        type: 'object',
        label: 'REPL',
        category: 'Tools',
        requiresRestart: false,
        default: {},
        description: 'REPL tool settings.',
        showInDialog: false,
        properties: {
          sandboxTier: {
            type: 'string',
            label: 'Sandbox Tier',
            category: 'Tools',
            requiresRestart: true,
            default: 'tier1' as string,
            description:
              'Sandbox tier for REPL execution (tier1=local, tier2=docker).',
            showInDialog: true,
          },
          timeoutSeconds: {
            type: 'number',
            label: 'Timeout',
            category: 'Tools',
            requiresRestart: false,
            default: 30 as number,
            description: 'Execution timeout in seconds.',
            showInDialog: true,
          },
          dockerImage: {
            type: 'string',
            label: 'Docker Image',
            category: 'Tools',
            requiresRestart: true,
            default: undefined as string | undefined,
            description: 'Docker image for REPL execution.',
            showInDialog: true,
          },
        },
      },
      guiAutomation: {
        type: 'object',
        label: 'GUI Automation',
        category: 'Tools',
        requiresRestart: false,
        default: {},
        description: 'GUI automation settings.',
        showInDialog: false,
        properties: {
          enabled: {
            type: 'boolean',
            label: 'Enable GUI Automation',
            category: 'Tools',
            requiresRestart: true,
            default: true,
            description: 'Enable desktop GUI automation tools.',
            showInDialog: true,
          },
          minReviewLevel: {
            type: 'enum',
            label: 'Min Review Level',
            category: 'Tools',
            requiresRestart: false,
            default: 'B',
            options: [
              { value: 'A', label: 'A (Low)' },
              { value: 'B', label: 'B (Medium)' },
              { value: 'C', label: 'C (High)' },
            ],
          },
          clickMinReviewLevel: {
            type: 'enum',
            label: 'Click Min Review Level',
            category: 'Tools',
            requiresRestart: false,
            default: 'B',
            options: [
              { value: 'A', label: 'A (Low)' },
              { value: 'B', label: 'B (Medium)' },
              { value: 'C', label: 'C (High)' },
            ],
          },
          typeMinReviewLevel: {
            type: 'enum',
            label: 'Type Min Review Level',
            category: 'Tools',
            requiresRestart: false,
            default: 'B',
            options: [
              { value: 'A', label: 'A (Low)' },
              { value: 'B', label: 'B (Medium)' },
              { value: 'C', label: 'C (High)' },
            ],
          },
          redactTypedTextByDefault: {
            type: 'boolean',
            label: 'Redact Typed Text',
            category: 'Security',
            requiresRestart: false,
            default: true,
          },
          snapshotMaxDepth: {
            type: 'number',
            label: 'Snapshot Max Depth',
            category: 'Advanced',
            requiresRestart: false,
            default: 10 as number,
          },
          snapshotMaxNodes: {
            type: 'number',
            label: 'Snapshot Max Nodes',
            category: 'Advanced',
            requiresRestart: false,
            default: 100 as number,
          },
          maxActionsPerMinute: {
            type: 'number',
            label: 'Max Actions Per Minute',
            category: 'Advanced',
            requiresRestart: false,
            default: 60 as number,
          },
        },
      },
      enableHooks: {
        type: 'boolean',
        label: 'Enable Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: true,
        description: 'Enable custom hooks.',
        showInDialog: true,
      },
      allowed: {
        type: 'array',
        label: 'Allowed Tools',
        category: 'Security',
        requiresRestart: false,
        default: [] as string[],
        description: 'List of explicitly allowed tools.',
        showInDialog: false,
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
      enableMessageBusIntegration: {
        type: 'boolean',
        label: 'Enable Message Bus',
        category: 'Advanced',
        requiresRestart: false,
        default: true,
        description: 'Integrate with the system message bus.',
        showInDialog: true,
      },
      exclude: {
        type: 'array',
        label: 'Excluded Tools',
        category: 'Tools',
        requiresRestart: false,
        default: [] as string[],
        description: 'List of tools to exclude.',
        showInDialog: false,
        items: { type: 'string' },
        mergeStrategy: MergeStrategy.UNION,
      },
    },
  },

  privacy: {
    type: 'object',
    label: 'Privacy',
    category: 'Security',
    requiresRestart: false,
    default: {},
    description: 'Privacy settings.',
    showInDialog: false,
    properties: {
      usageStatisticsEnabled: {
        type: 'boolean',
        label: 'Usage Statistics',
        category: 'Security',
        requiresRestart: false,
        default: true,
        description: 'Help improve TerminaI by sending anonymous usage data.',
        showInDialog: true,
      },
    },
  },

  hooks: {
    type: 'object',
    label: 'Hooks',
    category: 'Advanced',
    requiresRestart: false,
    default: {},
    description:
      'Hook configurations for intercepting and customizing agent behavior.',
    showInDialog: false,
    properties: {
      disabled: {
        type: 'array',
        label: 'Disabled Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [] as string[],
        description:
          'List of hook names (commands) that should be disabled. Hooks in this list will not execute even if configured.',
        showInDialog: false,
        items: {
          type: 'string',
          description: 'Hook command name',
        },
        mergeStrategy: MergeStrategy.UNION,
      },
      BeforeTool: {
        type: 'array',
        label: 'Before Tool Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute before tool execution. Can intercept, validate, or modify tool calls.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      AfterTool: {
        type: 'array',
        label: 'After Tool Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute after tool execution. Can process results, log outputs, or trigger follow-up actions.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      BeforeAgent: {
        type: 'array',
        label: 'Before Agent Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute before agent loop starts. Can set up context or initialize resources.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      AfterAgent: {
        type: 'array',
        label: 'After Agent Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute after agent loop completes. Can perform cleanup or summarize results.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      Notification: {
        type: 'array',
        label: 'Notification Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute on notification events (errors, warnings, info). Can log or alert on specific conditions.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      SessionStart: {
        type: 'array',
        label: 'Session Start Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute when a session starts. Can initialize session-specific resources or state.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      SessionEnd: {
        type: 'array',
        label: 'Session End Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute when a session ends. Can perform cleanup or persist session data.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      PreCompress: {
        type: 'array',
        label: 'Pre-Compress Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute before chat history compression. Can back up or analyze conversation before compression.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      BeforeModel: {
        type: 'array',
        label: 'Before Model Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute before LLM requests. Can modify prompts, inject context, or control model parameters.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      AfterModel: {
        type: 'array',
        label: 'After Model Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute after LLM responses. Can process outputs, extract information, or log interactions.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
      BeforeToolSelection: {
        type: 'array',
        label: 'Before Tool Selection Hooks',
        category: 'Advanced',
        requiresRestart: false,
        default: [],
        description:
          'Hooks that execute before tool selection. Can filter or prioritize available tools dynamically.',
        showInDialog: false,
        ref: 'HookDefinitionArray',
        mergeStrategy: MergeStrategy.CONCAT,
      },
    },
    additionalProperties: {
      type: 'array',
      description:
        'Custom hook event arrays that contain hook definitions for user-defined events',
      mergeStrategy: MergeStrategy.CONCAT,
    },
  },
} as const satisfies SettingsSchema;

export type SettingsSchemaType = typeof SETTINGS_SCHEMA;

export function getSettingsSchema(): SettingsSchemaType {
  return SETTINGS_SCHEMA;
}

export type SettingsJsonSchemaDefinition = Record<string, unknown>;

export const SETTINGS_SCHEMA_DEFINITIONS: Record<
  string,
  SettingsJsonSchemaDefinition
> = {
  MCPServerConfig: {
    type: 'object',
    description:
      'Definition of a Model Context Protocol (MCP) server configuration.',
    additionalProperties: false,
    properties: {
      command: {
        type: 'string',
        description: 'Executable invoked for stdio transport.',
      },
      args: {
        type: 'array',
        description: 'Command-line arguments for the stdio transport command.',
        items: { type: 'string' },
      },
      env: {
        type: 'object',
        description: 'Environment variables to set for the server process.',
        additionalProperties: { type: 'string' },
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the server process.',
      },
      url: {
        type: 'string',
        description: 'SSE transport URL.',
      },
      httpUrl: {
        type: 'string',
        description: 'Streaming HTTP transport URL.',
      },
      headers: {
        type: 'object',
        description: 'Additional HTTP headers sent to the server.',
        additionalProperties: { type: 'string' },
      },
      tcp: {
        type: 'string',
        description: 'TCP address for websocket transport.',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds for MCP requests.',
      },
      trust: {
        type: 'boolean',
        description:
          'Marks the server as trusted. Trusted servers may gain additional capabilities.',
      },
      description: {
        type: 'string',
        description: 'Human-readable description of the server.',
      },
      includeTools: {
        type: 'array',
        description:
          'Subset of tools that should be enabled for this server. When omitted all tools are enabled.',
        items: { type: 'string' },
      },
      excludeTools: {
        type: 'array',
        description:
          'Tools that should be disabled for this server even if exposed.',
        items: { type: 'string' },
      },
      extension: {
        type: 'object',
        description:
          'Metadata describing the Gemini CLI extension that owns this MCP server.',
        additionalProperties: { type: ['string', 'boolean', 'number'] },
      },
      oauth: {
        type: 'object',
        description: 'OAuth configuration for authenticating with the server.',
        additionalProperties: true,
      },
      authProviderType: {
        type: 'string',
        description:
          'Authentication provider used for acquiring credentials (for example `dynamic_discovery`).',
        enum: [
          'dynamic_discovery',
          'google_credentials',
          'service_account_impersonation',
        ],
      },
      targetAudience: {
        type: 'string',
        description:
          'OAuth target audience (CLIENT_ID.apps.googleusercontent.com).',
      },
      targetServiceAccount: {
        type: 'string',
        description:
          'Service account email to impersonate (name@project.iam.gserviceaccount.com).',
      },
    },
  },
  TelemetrySettings: {
    type: 'object',
    description: 'Telemetry configuration for Gemini CLI.',
    additionalProperties: false,
    properties: {
      enabled: {
        type: 'boolean',
        description: 'Enables telemetry emission.',
      },
      target: {
        type: 'string',
        description:
          'Telemetry destination (for example `stderr`, `stdout`, or `otlp`).',
      },
      otlpEndpoint: {
        type: 'string',
        description: 'Endpoint for OTLP exporters.',
      },
      otlpProtocol: {
        type: 'string',
        description: 'Protocol for OTLP exporters.',
        enum: ['grpc', 'http'],
      },
      logPrompts: {
        type: 'boolean',
        description: 'Whether prompts are logged in telemetry payloads.',
      },
      outfile: {
        type: 'string',
        description: 'File path for writing telemetry output.',
      },
      useCollector: {
        type: 'boolean',
        description: 'Whether to forward telemetry to an OTLP collector.',
      },
      useCliAuth: {
        type: 'boolean',
        description:
          'Whether to use CLI authentication for telemetry (only for in-process exporters).',
      },
    },
  },
  BugCommandSettings: {
    type: 'object',
    description: 'Configuration for the bug report helper command.',
    additionalProperties: false,
    properties: {
      urlTemplate: {
        type: 'string',
        description:
          'Template used to open a bug report URL. Variables in the template are populated at runtime.',
      },
    },
    required: ['urlTemplate'],
  },
  SummarizeToolOutputSettings: {
    type: 'object',
    description:
      'Controls summarization behavior for individual tools. All properties are optional.',
    additionalProperties: false,
    properties: {
      tokenBudget: {
        type: 'number',
        description:
          'Maximum number of tokens used when summarizing tool output.',
      },
    },
  },
  CustomTheme: {
    type: 'object',
    description:
      'Custom theme definition used for styling Gemini CLI output. Colors are provided as hex strings or named ANSI colors.',
    additionalProperties: false,
    properties: {
      type: {
        type: 'string',
        enum: ['custom'],
        default: 'custom',
      },
      name: {
        type: 'string',
        description: 'Theme display name.',
      },
      text: {
        type: 'object',
        additionalProperties: false,
        properties: {
          primary: { type: 'string' },
          secondary: { type: 'string' },
          link: { type: 'string' },
          accent: { type: 'string' },
        },
      },
      background: {
        type: 'object',
        additionalProperties: false,
        properties: {
          primary: { type: 'string' },
          diff: {
            type: 'object',
            additionalProperties: false,
            properties: {
              added: { type: 'string' },
              removed: { type: 'string' },
            },
          },
        },
      },
      border: {
        type: 'object',
        additionalProperties: false,
        properties: {
          default: { type: 'string' },
          focused: { type: 'string' },
        },
      },
      ui: {
        type: 'object',
        additionalProperties: false,
        properties: {
          comment: { type: 'string' },
          symbol: { type: 'string' },
          gradient: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      status: {
        type: 'object',
        additionalProperties: false,
        properties: {
          error: { type: 'string' },
          success: { type: 'string' },
          warning: { type: 'string' },
        },
      },
      Background: { type: 'string' },
      Foreground: { type: 'string' },
      LightBlue: { type: 'string' },
      AccentBlue: { type: 'string' },
      AccentPurple: { type: 'string' },
      AccentCyan: { type: 'string' },
      AccentGreen: { type: 'string' },
      AccentYellow: { type: 'string' },
      AccentRed: { type: 'string' },
      DiffAdded: { type: 'string' },
      DiffRemoved: { type: 'string' },
      Comment: { type: 'string' },
      Gray: { type: 'string' },
      DarkGray: { type: 'string' },
      GradientColors: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['type', 'name'],
  },
  StringOrStringArray: {
    description: 'Accepts either a single string or an array of strings.',
    anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  },
  BooleanOrString: {
    description: 'Accepts either a boolean flag or a string command name.',
    anyOf: [{ type: 'boolean' }, { type: 'string' }],
  },
  HookDefinitionArray: {
    type: 'array',
    description: 'Array of hook definition objects for a specific event.',
    items: {
      type: 'object',
      description:
        'Hook definition specifying matcher pattern and hook configurations.',
      properties: {
        matcher: {
          type: 'string',
          description:
            'Pattern to match against the event context (tool name, notification type, etc.). Supports exact match, regex (/pattern/), and wildcards (*).',
        },
        hooks: {
          type: 'array',
          description: 'Hooks to execute when the matcher matches.',
          items: {
            type: 'object',
            description: 'Individual hook configuration.',
            properties: {
              name: {
                type: 'string',
                description: 'Unique identifier for the hook.',
              },
              type: {
                type: 'string',
                description:
                  'Type of hook (currently only "command" supported).',
              },
              command: {
                type: 'string',
                description:
                  'Shell command to execute. Receives JSON input via stdin and returns JSON output via stdout.',
              },
              description: {
                type: 'string',
                description: 'A description of the hook.',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds for hook execution.',
              },
            },
          },
        },
      },
    },
  },
};

export type InferSettings<T> = {
  -readonly [K in keyof T]?: T[K] extends { properties: infer P }
    ? InferSettings<P>
    : T[K] extends { type: 'enum'; options: readonly SettingEnumOption[] }
      ? T[K]['options'][number]['value']
      : T[K] extends { default: infer D }
        ? D extends boolean
          ? boolean
          : D
        : any;
};

export type Settings = InferSettings<SettingsSchemaType>;
