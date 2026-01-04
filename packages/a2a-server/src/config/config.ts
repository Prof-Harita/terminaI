/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as dotenv from 'dotenv';

import type { TelemetryTarget, ProviderConfig } from '@terminai/core';
import {
  AuthType,
  Config,
  type ConfigParameters,
  FileDiscoveryService,
  ApprovalMode,
  loadServerHierarchicalMemory,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  DEFAULT_GEMINI_MODEL,
  type ExtensionLoader,
  startupProfiler,
  PREVIEW_GEMINI_MODEL,
  findEnvFile,
  LlmProviderId,
} from '@terminai/core';

import { logger } from '../utils/logger.js';
import type { LoadedSettings } from './settings.js';
import { type AgentSettings, CoderAgentEvent } from '../types.js';

export interface LoadConfigOptions {
  /**
   * When true, the server will start without calling `config.refreshAuth(...)`.
   * This enables "deferred auth" flows (e.g. Desktop sidecar) where the client
   * completes LLM auth after the server boots.
   */
  readonly deferLlmAuth?: boolean;
}

/**
 * 3.3 Fix: Compute ProviderConfig from settings to persist provider across restarts.
 * Mirrors CLI's settingsToProviderConfig behavior.
 */
function settingsToProviderConfig(settings: LoadedSettings['merged']): {
  providerConfig: ProviderConfig;
  resolvedModel?: string;
} {
  let providerConfig: ProviderConfig = { provider: LlmProviderId.GEMINI };
  let resolvedModel: string | undefined;

  if (settings.llm?.provider === 'openai_compatible') {
    const s = settings.llm.openaiCompatible;
    const openaiModel = s?.model;
    if (s?.baseUrl && openaiModel) {
      let authType: 'none' | 'api-key' | 'bearer' = 'none';
      const auth = s.auth as
        | { type?: 'none' | 'api-key' | 'bearer'; envVarName?: string }
        | undefined;
      if (auth?.type === 'api-key') authType = 'api-key';
      else if (auth?.type === 'bearer') authType = 'bearer';

      providerConfig = {
        provider: LlmProviderId.OPENAI_COMPATIBLE,
        baseUrl: s.baseUrl,
        model: openaiModel,
        auth: {
          type: authType,
          apiKey: auth?.envVarName ? process.env[auth.envVarName] : undefined,
          envVarName: auth?.envVarName,
        },
      };
      resolvedModel = openaiModel;
    } else {
      logger.warn(
        '[Config] llm.provider is openai_compatible but baseUrl/model missing, falling back to Gemini',
      );
    }
  } else if (settings.llm?.provider === 'anthropic') {
    providerConfig = { provider: LlmProviderId.ANTHROPIC };
  }

  return { providerConfig, resolvedModel };
}

export async function loadConfig(
  loadedSettings: LoadedSettings,
  extensionLoader: ExtensionLoader,
  taskId: string,
  targetDirOverride?: string,
  options?: LoadConfigOptions,
): Promise<Config> {
  const settings = loadedSettings.merged;
  const workspaceDir = targetDirOverride || process.cwd();
  const adcFilePath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

  // 3.3 Fix: Compute providerConfig from persisted settings
  const { providerConfig, resolvedModel } = settingsToProviderConfig(settings);

  const configParams: ConfigParameters = {
    sessionId: taskId,
    // Use OpenAI model if set, otherwise Gemini model
    model:
      resolvedModel ||
      (settings.general?.previewFeatures
        ? PREVIEW_GEMINI_MODEL
        : DEFAULT_GEMINI_MODEL),
    embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL,
    sandbox: undefined,
    targetDir: workspaceDir,
    debugMode: process.env['DEBUG'] === 'true' || false,
    // 3.3 Fix: Pass provider config from settings
    providerConfig,
    question: '',

    // CRITICAL FIX: V2 nested paths (not V1 flat paths)
    coreTools: settings.tools?.core || undefined,
    excludeTools: settings.tools?.exclude || undefined,
    showMemoryUsage: settings.ui?.showMemoryUsage || false,
    approvalMode:
      process.env['GEMINI_YOLO_MODE'] === 'true'
        ? ApprovalMode.YOLO
        : ApprovalMode.DEFAULT,
    mcpServers: settings.mcpServers,
    cwd: workspaceDir,
    telemetry: {
      enabled: settings.telemetry?.enabled,
      target: settings.telemetry?.target as TelemetryTarget,
      otlpEndpoint:
        process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
        settings.telemetry?.otlpEndpoint,
      logPrompts: settings.telemetry?.logPrompts,
    },
    // CRITICAL FIX: V2 nested paths for fileFiltering
    fileFiltering: {
      respectGitIgnore: settings.context?.fileFiltering?.respectGitIgnore,
      respectGeminiIgnore: settings.context?.fileFiltering?.respectGeminiIgnore,
      enableRecursiveFileSearch:
        settings.context?.fileFiltering?.enableRecursiveFileSearch,
      disableFuzzySearch: settings.context?.fileFiltering?.disableFuzzySearch,
    },
    ideMode: false,
    // CRITICAL FIX: V2 nested path for folderTrust
    folderTrust: settings.security?.folderTrust?.enabled === true,
    extensionLoader,
    // CRITICAL FIX: V2 nested path for checkpointing
    checkpointing: process.env['CHECKPOINTING']
      ? process.env['CHECKPOINTING'] === 'true'
      : settings.general?.checkpointing?.enabled,
    previewFeatures: settings.general?.previewFeatures,
    interactive: true,
    webRemoteRelayUrl: process.env['WEB_REMOTE_RELAY_URL'],
  };

  const fileService = new FileDiscoveryService(workspaceDir);
  const { memoryContent, fileCount } = await loadServerHierarchicalMemory(
    workspaceDir,
    [],
    configParams.debugMode ?? false,
    fileService,
    extensionLoader,
    // CRITICAL FIX: V2 nested path for folderTrust
    settings.security?.folderTrust?.enabled === true,
    'tree',
    undefined,
    200,
  );
  configParams.userMemory = memoryContent;
  configParams.geminiMdFileCount = fileCount;
  const config = new Config({
    ...configParams,
  });
  // Needed to initialize ToolRegistry, and git checkpointing if enabled
  await config.initialize();
  startupProfiler.flush(config);

  // Task 9: Deferred auth mode (skip initial refreshAuth)
  if (options?.deferLlmAuth === true) {
    logger.info(
      '[Config] Deferred auth enabled; skipping initial auth refresh.',
    );
    return config;
  }

  if (process.env['USE_CCPA']) {
    logger.info('[Config] Using CCPA Auth:');
    try {
      if (adcFilePath) {
        path.resolve(adcFilePath);
      }
    } catch (e) {
      logger.error(
        `[Config] USE_CCPA env var is true but unable to resolve GOOGLE_APPLICATION_CREDENTIALS file path ${adcFilePath}. Error ${e}`,
      );
    }
    await config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);
    logger.info(
      `[Config] GOOGLE_CLOUD_PROJECT: ${process.env['GOOGLE_CLOUD_PROJECT']}`,
    );
  } else {
    // Task 10: Respect settings.security.auth.selectedType
    const selectedAuthType = settings.security?.auth?.selectedType;

    if (selectedAuthType) {
      logger.info(`[Config] Using configured auth type: ${selectedAuthType}`);
      await config.refreshAuth(selectedAuthType);
    } else if (process.env['GEMINI_API_KEY']) {
      logger.info('[Config] Using Gemini API Key (Implicit)');
      await config.refreshAuth(AuthType.USE_GEMINI);
    } else {
      logger.info('[Config] Using OAuth (LOGIN_WITH_GOOGLE) (Default)');
      await config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);
    }
  }

  return config;
}

export function setTargetDir(agentSettings: AgentSettings | undefined): string {
  const originalCWD = process.cwd();
  const targetDir =
    process.env['CODER_AGENT_WORKSPACE_PATH'] ??
    (agentSettings?.kind === CoderAgentEvent.StateAgentSettingsEvent
      ? agentSettings.workspacePath
      : undefined);

  if (!targetDir) {
    return originalCWD;
  }

  logger.info(
    `[CoderAgentExecutor] Overriding workspace path to: ${targetDir}`,
  );

  try {
    const resolvedPath = path.resolve(targetDir);
    // process.chdir(resolvedPath); // DISABLED: Global state mutation causes issues in multi-task server
    return resolvedPath;
  } catch (e) {
    logger.error(
      `[CoderAgentExecutor] Error resolving workspace path: ${e}, returning original os.cwd()`,
    );
    return originalCWD;
  }
}

/**
 * Loads environment variables from .env file.
 * Uses Core's findEnvFile for parity with CLI.
 */
export function loadEnvironment(startDir?: string): void {
  const envFilePath = findEnvFile(startDir || process.cwd());
  if (envFilePath) {
    // G-2 FIX: No override:true for CLI parity
    dotenv.config({ path: envFilePath });
  }
}
