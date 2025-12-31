/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as dotenv from 'dotenv';

import type { TelemetryTarget } from '@terminai/core';
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
} from '@terminai/core';

import { logger } from '../utils/logger.js';
import type { LoadedSettings } from './settings.js';
import { type AgentSettings, CoderAgentEvent } from '../types.js';

export async function loadConfig(
  loadedSettings: LoadedSettings,
  extensionLoader: ExtensionLoader,
  taskId: string,
  targetDirOverride?: string,
): Promise<Config> {
  const workspaceDir = targetDirOverride || process.cwd();
  const adcFilePath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

  // Access merged settings
  const settings = loadedSettings.merged;

  const configParams: ConfigParameters = {
    sessionId: taskId,
    model: settings.general?.previewFeatures
      ? PREVIEW_GEMINI_MODEL
      : DEFAULT_GEMINI_MODEL,
    embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL,
    sandbox: undefined, // Sandbox might not be relevant for a server-side agent
    targetDir: workspaceDir, // Or a specific directory the agent operates on
    debugMode: process.env['DEBUG'] === 'true' || false,
    question: '', // Not used in server mode directly like CLI

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
    // Git-aware file filtering settings
    fileFiltering: {
      respectGitIgnore: settings.context?.fileFiltering?.respectGitIgnore,
      respectGeminiIgnore: settings.context?.fileFiltering?.respectGeminiIgnore,
      enableRecursiveFileSearch:
        settings.context?.fileFiltering?.enableRecursiveFileSearch,
      disableFuzzySearch: settings.context?.fileFiltering?.disableFuzzySearch,
    },
    ideMode: false,
    folderTrust: settings.security?.folderTrust?.enabled === true,
    extensionLoader,
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
    [], // Align with CLI: empty includeDirectories
    configParams.debugMode ?? false, // Align with CLI: use debugMode from config
    fileService,
    extensionLoader,
    settings.security?.folderTrust?.enabled === true,
    'tree', // Align with CLI: explicit importFormat
    undefined, // Align with CLI: use core defaults for filtering
    200, // Align with CLI: explicit maxDirs
  );
  configParams.userMemory = memoryContent;
  configParams.geminiMdFileCount = fileCount;
  const config = new Config({
    ...configParams,
  });
  // Needed to initialize ToolRegistry, and git checkpointing if enabled
  await config.initialize();
  startupProfiler.flush(config);

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
  } else if (process.env['GEMINI_API_KEY']) {
    logger.info('[Config] Using Gemini API Key');
    await config.refreshAuth(AuthType.USE_GEMINI);
  } else {
    logger.info('[Config] Using OAuth (LOGIN_WITH_GOOGLE)');
    await config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);
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

export function loadEnvironment(startDir?: string): void {
  const envFilePath = findEnvFile(startDir || process.cwd());
  if (envFilePath) {
    dotenv.config({ path: envFilePath, override: true });
  }
}
