/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir, platform } from 'node:os';
import * as dotenv from 'dotenv';
import process from 'node:process';
import stripJsonComments from 'strip-json-comments';
import {
  FatalConfigError,
  GEMINI_DIR,
  getErrorMessage,
  Storage,
  coreEvents,
  Config,
  type ConfigParameters,
  ApprovalMode,
  LlmProviderId,
  type ProviderConfig,
  PREVIEW_GEMINI_MODEL_AUTO,
  DEFAULT_GEMINI_MODEL_AUTO,
} from '../index.js';
import {
  SettingScope,
  type Settings,
  type SettingsError,
} from './settings/types.js';
import { DEFAULT_EXCLUDED_ENV_VARS } from './settings/constants.js';
import { LoadedSettings, mergeSettings } from './settings/loader.js';
import { migrateSettingsToV2, needsMigration } from './settings/migrate.js';
import {
  validateSettings,
  formatValidationError,
} from './settings/validate.js';
import { isWorkspaceTrusted } from './settings/trust.js';
import { resolveEnvVarsInObject } from '../utils/envVarResolver.js';
import {
  createPolicyEngineConfig,
  resolvePolicyBrainAuthority,
} from '../policy/config.js';

/**
 * Options for the SettingsLoader.
 */
export interface SettingsLoaderOptions {
  workspaceDir?: string;
  systemSettingsPath?: string;
  systemDefaultsPath?: string;
  userSettingsPath?: string;
  overwriteV2?: boolean;
  themeMappings?: Record<string, string>;
}

/**
 * Orchestrates loading settings from multiple scopes.
 */
export class SettingsLoader {
  private readonly options: Required<SettingsLoaderOptions>;

  constructor(options: SettingsLoaderOptions = {}) {
    this.options = {
      workspaceDir: options.workspaceDir ?? process.cwd(),
      systemSettingsPath: options.systemSettingsPath ?? getSystemSettingsPath(),
      systemDefaultsPath: options.systemDefaultsPath ?? getSystemDefaultsPath(),
      userSettingsPath:
        options.userSettingsPath ?? Storage.getGlobalSettingsPath(),
      overwriteV2: options.overwriteV2 ?? true,
      themeMappings: options.themeMappings ?? {},
    };
  }

  load(): LoadedSettings {
    const settingsErrors: SettingsError[] = [];
    const migratedInMemoryScopes = new Set<SettingScope>();

    const workspaceSettingsPath = new Storage(
      this.options.workspaceDir,
    ).getWorkspaceSettingsPath();

    const loadAndMigrate = (
      filePath: string,
      scope: SettingScope,
    ): { settings: Settings; rawJson?: string } => {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const rawSettings: unknown = JSON.parse(stripJsonComments(content));

          if (
            typeof rawSettings !== 'object' ||
            rawSettings === null ||
            Array.isArray(rawSettings)
          ) {
            settingsErrors.push({
              message: 'Settings file is not a valid JSON object.',
              path: filePath,
            });
            return { settings: {} };
          }

          let settingsObject = rawSettings as Record<string, unknown>;
          if (needsMigration(settingsObject)) {
            const migratedSettings = migrateSettingsToV2(settingsObject);
            if (migratedSettings) {
              if (this.options.overwriteV2) {
                try {
                  fs.renameSync(filePath, `${filePath}.orig`);
                  fs.writeFileSync(
                    filePath,
                    JSON.stringify(migratedSettings, null, 2),
                    'utf-8',
                  );
                } catch (e) {
                  coreEvents.emitFeedback(
                    'error',
                    'Failed to migrate settings file.',
                    e,
                  );
                }
              } else {
                migratedInMemoryScopes.add(scope);
              }
              settingsObject = migratedSettings;
            }
          }

          const validationResult = validateSettings(settingsObject);
          if (!validationResult.success && validationResult.error) {
            const errorMessage = formatValidationError(
              validationResult.error,
              filePath,
            );
            throw new FatalConfigError(errorMessage);
          }

          return { settings: settingsObject as Settings, rawJson: content };
        }
      } catch (error: unknown) {
        if (error instanceof FatalConfigError) {
          throw error;
        }
        settingsErrors.push({
          message: getErrorMessage(error),
          path: filePath,
        });
      }
      return { settings: {} };
    };

    const systemResult = loadAndMigrate(
      this.options.systemSettingsPath,
      SettingScope.System,
    );
    const systemDefaultsResult = loadAndMigrate(
      this.options.systemDefaultsPath,
      SettingScope.SystemDefaults,
    );
    const userResult = loadAndMigrate(
      this.options.userSettingsPath,
      SettingScope.User,
    );

    let workspaceResult: { settings: Settings; rawJson?: string } = {
      settings: {} as Settings,
      rawJson: undefined,
    };

    const resolvedWorkspaceDir = path.resolve(this.options.workspaceDir);
    const resolvedHomeDir = path.resolve(homedir());
    let realWorkspaceDir = resolvedWorkspaceDir;
    try {
      realWorkspaceDir = fs.realpathSync(resolvedWorkspaceDir);
    } catch (_e) {}
    const realHomeDir = fs.realpathSync(resolvedHomeDir);

    if (realWorkspaceDir !== realHomeDir) {
      workspaceResult = loadAndMigrate(
        workspaceSettingsPath,
        SettingScope.Workspace,
      );
    }

    const systemSettings = resolveEnvVarsInObject(systemResult.settings);
    const systemDefaultSettings = resolveEnvVarsInObject(
      systemDefaultsResult.settings,
    );
    const userSettings = resolveEnvVarsInObject(userResult.settings);
    const workspaceSettings = resolveEnvVarsInObject(workspaceResult.settings);

    this.applyThemeMappings(userSettings);
    this.applyThemeMappings(workspaceSettings);

    const initialTrustCheckSettings = mergeSettings(
      systemSettings,
      systemDefaultSettings,
      userSettings,
      {},
      true,
    );
    const isTrusted =
      isWorkspaceTrusted(initialTrustCheckSettings).isTrusted ?? true;

    const tempMergedSettings = mergeSettings(
      systemSettings,
      systemDefaultSettings,
      userSettings,
      workspaceSettings,
      isTrusted,
    );

    this.loadEnvironment(tempMergedSettings);

    if (settingsErrors.length > 0) {
      const errorMessages = settingsErrors.map(
        (error) => `Error in ${error.path}: ${error.message}`,
      );
      throw new FatalConfigError(
        `${errorMessages.join('\n')}\nPlease fix the configuration file(s) and try again.`,
      );
    }

    return new LoadedSettings(
      {
        path: this.options.systemSettingsPath,
        settings: systemSettings,
        originalSettings: structuredClone(systemResult.settings),
        rawJson: systemResult.rawJson,
      },
      {
        path: this.options.systemDefaultsPath,
        settings: systemDefaultSettings,
        originalSettings: structuredClone(systemDefaultsResult.settings),
        rawJson: systemDefaultsResult.rawJson,
      },
      {
        path: this.options.userSettingsPath,
        settings: userSettings,
        originalSettings: structuredClone(userResult.settings),
        rawJson: userResult.rawJson,
      },
      {
        path: workspaceSettingsPath,
        settings: workspaceSettings,
        originalSettings: structuredClone(workspaceResult.settings),
        rawJson: workspaceResult.rawJson,
      },
      isTrusted,
      migratedInMemoryScopes,
    );
  }

  private applyThemeMappings(settings: Settings): void {
    if (settings.ui?.theme && this.options.themeMappings[settings.ui.theme]) {
      settings.ui.theme = this.options.themeMappings[settings.ui.theme];
    }
  }

  private loadEnvironment(settings: Settings): void {
    const envFilePath = findEnvFile(this.options.workspaceDir);

    if (!isWorkspaceTrusted(settings).isTrusted) {
      return;
    }

    if (process.env['CLOUD_SHELL'] === 'true') {
      setUpCloudShellEnvironment(envFilePath);
    }

    if (envFilePath) {
      try {
        const envFileContent = fs.readFileSync(envFilePath, 'utf-8');
        const parsedEnv = dotenv.parse(envFileContent);

        const excludedVars =
          settings?.advanced?.excludedEnvVars || DEFAULT_EXCLUDED_ENV_VARS;
        const isProjectEnvFile = !envFilePath.includes(GEMINI_DIR);

        for (const key in parsedEnv) {
          if (Object.hasOwn(parsedEnv, key)) {
            if (isProjectEnvFile && excludedVars.includes(key)) {
              continue;
            }
            if (!Object.hasOwn(process.env, key)) {
              process.env[key] = parsedEnv[key];
            }
          }
        }
      } catch (_e) {}
    }
  }
}

/**
 * Builds a Config object from settings and environment.
 */
export class ConfigBuilder {
  constructor(private readonly sessionId: string) {}

  async build(
    options: SettingsLoaderOptions & {
      question?: string;
      approvalMode?: ApprovalMode;
    } = {},
  ): Promise<Config> {
    const loader = new SettingsLoader(options);
    const loadedSettings = loader.load();
    const settings = loadedSettings.merged;

    const approvalMode =
      options.approvalMode ??
      (settings.security?.disableYoloMode
        ? ApprovalMode.DEFAULT
        : ApprovalMode.YOLO);

    const policyEngineConfig = await createPolicyEngineConfig(
      settings as any,
      approvalMode,
    );
    const policyBrainAuthority = await resolvePolicyBrainAuthority();

    const defaultModel = settings.general?.previewFeatures
      ? PREVIEW_GEMINI_MODEL_AUTO
      : DEFAULT_GEMINI_MODEL_AUTO;
    const resolvedModel =
      process.env['GEMINI_MODEL'] || settings.model?.name || defaultModel;

    const provider =
      (settings.llm?.provider as LlmProviderId) ?? LlmProviderId.GEMINI;

    let providerConfig: ProviderConfig;
    if (provider === LlmProviderId.OPENAI_COMPATIBLE) {
      providerConfig = {
        provider: LlmProviderId.OPENAI_COMPATIBLE,
        baseUrl: settings.llm?.openaiCompatible?.baseUrl ?? '',
        model: settings.llm?.openaiCompatible?.model ?? '',
        auth: settings.llm?.openaiCompatible?.auth as any,
        headers: settings.llm?.headers,
      };
    } else if (provider === LlmProviderId.ANTHROPIC) {
      providerConfig = { provider: LlmProviderId.ANTHROPIC };
    } else {
      providerConfig = { provider: LlmProviderId.GEMINI };
    }

    const configParams: ConfigParameters = {
      sessionId: this.sessionId,
      targetDir: options.workspaceDir ?? process.cwd(),
      cwd: options.workspaceDir ?? process.cwd(),
      debugMode: !!process.env['DEBUG'],
      question: options.question,
      approvalMode,
      policyEngineConfig,
      model: resolvedModel,
      brain: {
        policyAuthority: policyBrainAuthority,
      },
      providerConfig,
      // ... further parameters can be added here
    };

    return new Config(configParams);
  }
}

export function getSystemSettingsPath(): string {
  if (process.env['GEMINI_CLI_SYSTEM_SETTINGS_PATH']) {
    return process.env['GEMINI_CLI_SYSTEM_SETTINGS_PATH'];
  }
  if (platform() === 'darwin') {
    return '/Library/Application Support/GeminiCli/settings.json';
  } else if (platform() === 'win32') {
    return 'C:\\ProgramData\\gemini-cli\\settings.json';
  } else {
    return '/etc/gemini-cli/settings.json';
  }
}

export function getSystemDefaultsPath(): string {
  if (process.env['GEMINI_CLI_SYSTEM_DEFAULTS_PATH']) {
    return process.env['GEMINI_CLI_SYSTEM_DEFAULTS_PATH'];
  }
  return path.join(
    path.dirname(getSystemSettingsPath()),
    'system-defaults.json',
  );
}

export function findEnvFile(startDir: string): string | null {
  let currentDir = path.resolve(startDir);
  while (true) {
    const geminiEnvPath = path.join(currentDir, GEMINI_DIR, '.env');
    if (fs.existsSync(geminiEnvPath)) {
      return geminiEnvPath;
    }
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir || !parentDir) {
      const homeGeminiEnvPath = path.join(homedir(), GEMINI_DIR, '.env');
      if (fs.existsSync(homeGeminiEnvPath)) {
        return homeGeminiEnvPath;
      }
      const homeEnvPath = path.join(homedir(), '.env');
      if (fs.existsSync(homeEnvPath)) {
        return homeEnvPath;
      }
      return null;
    }
    currentDir = parentDir;
  }
}

export function setUpCloudShellEnvironment(envFilePath: string | null): void {
  if (envFilePath && fs.existsSync(envFilePath)) {
    const envFileContent = fs.readFileSync(envFilePath);
    const parsedEnv = dotenv.parse(envFileContent);
    if (parsedEnv['GOOGLE_CLOUD_PROJECT']) {
      process.env['GOOGLE_CLOUD_PROJECT'] = parsedEnv['GOOGLE_CLOUD_PROJECT'];
    } else {
      process.env['GOOGLE_CLOUD_PROJECT'] = 'cloudshell-gca';
    }
  } else {
    process.env['GOOGLE_CLOUD_PROJECT'] = 'cloudshell-gca';
  }
}
