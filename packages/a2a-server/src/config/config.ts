/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as dotenv from 'dotenv';

import {
  AuthType,
  type ExtensionLoader,
  startupProfiler,
  findEnvFile,
  ConfigBuilder,
} from '@terminai/core';

import { logger } from '../utils/logger.js';
import type { LoadedSettings } from './settings.js';
import { type AgentSettings, CoderAgentEvent } from '../types.js';

/**
 * Loads configuration using the shared ConfigBuilder for CLI-Desktop parity.
 *
 * This ensures A2A server uses the same:
 * - Model defaults (PREVIEW_GEMINI_MODEL_AUTO / DEFAULT_GEMINI_MODEL_AUTO)
 * - Approval mode resolution (from settings, not just env vars)
 * - Policy engine configuration
 * - Provider configuration (Gemini/OpenAI-compatible/Anthropic)
 * - All other ConfigParameters that CLI uses
 */
export async function loadConfig(
  loadedSettings: LoadedSettings,
  extensionLoader: ExtensionLoader,
  taskId: string,
  targetDirOverride?: string,
) {
  const workspaceDir = targetDirOverride || process.cwd();
  const adcFilePath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

  // Use ConfigBuilder for parity with CLI (G-1, G-3, G-4, G-8)
  const builder = new ConfigBuilder(taskId);
  const config = await builder.build({
    workspaceDir,
    overrides: {
      // A2A-specific overrides
      extensionLoader,
      interactive: true, // A2A is always interactive
      ideMode: false,
      webRemoteRelayUrl: process.env['WEB_REMOTE_RELAY_URL'],
    },
  });

  // Needed to initialize ToolRegistry, and git checkpointing if enabled
  await config.initialize();
  startupProfiler.flush(config);

  // Handle auth based on environment
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

/**
 * Loads environment variables from .env file.
 * G-2 FIX: Removed `override: true` to align with CLI behavior.
 */
export function loadEnvironment(startDir?: string): void {
  const envFilePath = findEnvFile(startDir || process.cwd());
  if (envFilePath) {
    dotenv.config({ path: envFilePath });
  }
}
