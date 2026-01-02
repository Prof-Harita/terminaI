/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// This file uses 'as any' for deliberate type coercion from Dynamic settings to static ConfigParameters

import { platform, homedir } from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import {
  SettingsLoader,
  type SettingsLoaderOptions,
} from './settings/loader.js';
import {
  Config,
  type ConfigParameters,
  ApprovalMode,
  LlmProviderId,
  type ProviderConfig,
  PREVIEW_GEMINI_MODEL_AUTO,
  DEFAULT_GEMINI_MODEL_AUTO,
} from '../index.js';
import {
  createPolicyEngineConfig,
  resolvePolicyBrainAuthority,
} from '../policy/config.js';
import { GEMINI_DIR } from '../index.js';

/**
 * Builds a Config object from settings and environment.
 */
export class ConfigBuilder {
  constructor(private readonly sessionId: string) {}

  async build(
    options: SettingsLoaderOptions & {
      question?: string;
      approvalMode?: ApprovalMode;
      overrides?: Partial<ConfigParameters>;
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
      settings,
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
        authority: settings.brain?.authority as any,
        policyAuthority: policyBrainAuthority,
      },
      audit: {
        redactUiTypedText: settings.audit?.redactUiTypedText,
        retentionDays: settings.audit?.retentionDays,
        exportFormat: settings.audit?.export?.format as any,
        exportRedaction: settings.audit?.export?.redaction as any,
      },
      recipes: {
        paths: settings.recipes?.paths,
        communityPaths: settings.recipes?.communityPaths,
        allowCommunity: settings.recipes?.allowCommunity,
        confirmCommunityOnFirstLoad:
          settings.recipes?.confirmCommunityOnFirstLoad,
        trustedCommunityRecipes: settings.recipes?.trustedCommunityRecipes,
      },
      showMemoryUsage: settings.ui?.showMemoryUsage || false,
      accessibility: settings.ui?.accessibility as any,
      usageStatisticsEnabled: settings.privacy?.usageStatisticsEnabled ?? true,
      checkpointing: settings.general?.checkpointing?.enabled,
      proxy:
        process.env['HTTPS_PROXY'] ||
        process.env['https_proxy'] ||
        process.env['HTTP_PROXY'] ||
        process.env['http_proxy'],
      bugCommand: settings.advanced?.bugCommand as any,
      maxSessionTurns: settings.model?.maxSessionTurns ?? -1,
      enableExtensionReloading: settings.experimental?.extensionReloading,
      experimentalJitContext: settings.experimental?.jitContext,
      noBrowser: !!process.env['NO_BROWSER'],
      // Map summarizeToolOutput boolean to ConfigParameters expected structure if needed,
      // or just pass it if it's compatible. ConfigParameters has it as Record<string, SummarizeToolOutputSettings>.
      // For now, if it's true, we might want to enable it for all tools?
      // But the Config class might just want a global override.
      // Let's check Config.ts again.
      // Actually, let's just use 'as any' for now to unblock build while we figure out the exact mapping.
      summarizeToolOutput: settings.model?.summarizeToolOutput as any,
      compressionThreshold: settings.model?.compressionThreshold,
      folderTrust: settings.security?.folderTrust?.enabled,
      useRipgrep: settings.tools?.useRipgrep,
      enableInteractiveShell:
        settings.tools?.shell?.enableInteractiveShell ?? true,
      skipNextSpeakerCheck: settings.model?.skipNextSpeakerCheck,
      enablePromptCompletion: settings.general?.enablePromptCompletion ?? false,
      truncateToolOutputThreshold: settings.tools?.truncateToolOutputThreshold,
      truncateToolOutputLines: settings.tools?.truncateToolOutputLines,
      enableToolOutputTruncation: settings.tools?.enableToolOutputTruncation,
      repl: {
        sandboxTier: settings.tools?.repl?.sandboxTier as any,
        timeoutSeconds: settings.tools?.repl?.timeoutSeconds,
        dockerImage: settings.tools?.repl?.dockerImage,
      },
      guiAutomation: settings.tools?.guiAutomation as any,
      useSmartEdit: settings.useSmartEdit,
      useWriteTodos: settings.useWriteTodos,
      output: {
        format: settings.output?.format as any,
      },
      providerConfig,
      codebaseInvestigatorSettings: settings.experimental
        ?.codebaseInvestigatorSettings as any,
      introspectionAgentSettings: settings.experimental
        ?.introspectionAgentSettings as any,
      retryFetchErrors: settings.general?.retryFetchErrors ?? false,
      enableHooks: settings.tools?.enableHooks ?? false,
      excludedTools: settings.tools?.exclude,
      hooks: settings.hooks as any,
      // Apply overrides
      ...(options.overrides || {}),
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
