/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandContext, SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import process from 'node:process';
import { MessageType, type HistoryItemAbout } from '../types.js';
import {
  IdeClient,
  UserAccountManager,
  debugLogger,
  getVersion,
  LlmProviderId,
} from '@terminai/core';

export const aboutCommand: SlashCommand = {
  name: 'about',
  description: 'Show version info',
  kind: CommandKind.BUILT_IN,
  hidden: true,
  autoExecute: true,
  action: async (context) => {
    const osVersion = process.platform;
    let sandboxEnv = 'no sandbox';
    if (process.env['SANDBOX'] && process.env['SANDBOX'] !== 'sandbox-exec') {
      sandboxEnv = process.env['SANDBOX'];
    } else if (process.env['SANDBOX'] === 'sandbox-exec') {
      sandboxEnv = `sandbox-exec (${
        process.env['SEATBELT_PROFILE'] || 'unknown'
      })`;
    }
    const modelVersion = context.services.config?.getModel() || 'Unknown';
    const cliVersion = await getVersion();
    const selectedAuthType =
      context.services.settings.merged.security?.auth?.selectedType || '';
    const gcpProject = process.env['GOOGLE_CLOUD_PROJECT'] || '';
    const ideClient = await getIdeClientName(context);

    const userAccountManager = new UserAccountManager();
    const cachedAccount = userAccountManager.getCachedGoogleAccount();
    debugLogger.log('AboutCommand: Retrieved cached Google account', {
      cachedAccount,
    });
    const userEmail = cachedAccount ?? undefined;
    const providerConfig = context.services.config?.getProviderConfig?.();
    const provider = providerConfig?.provider || 'gemini';

    let baseUrlHost: string | undefined;
    try {
      if (provider === LlmProviderId.OPENAI_COMPATIBLE) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pc = providerConfig as any;
        if (pc.baseUrl) {
          baseUrlHost = new URL(pc.baseUrl).host;
        }
      } else if (provider === LlmProviderId.GEMINI) {
        const baseUrl =
          process.env['TERMINAI_BASE_URL'] ||
          process.env['TERMINAI_GEMINI_BASE_URL'];
        if (baseUrl) {
          baseUrlHost = new URL(baseUrl).host;
        }
      }
    } catch {
      // Ignore invalid URLs
    }

    const aboutItem: Omit<HistoryItemAbout, 'id'> = {
      type: MessageType.ABOUT,
      cliVersion,
      osVersion,
      sandboxEnv,
      modelVersion,
      selectedAuthType,
      gcpProject,
      ideClient,
      userEmail,
      provider,
      effectiveModel: modelVersion,
      baseUrlHost,
    };

    context.ui.addItem(aboutItem, Date.now());
  },
};

async function getIdeClientName(context: CommandContext) {
  if (!context.services.config?.getIdeMode()) {
    return '';
  }
  const ideClient = await IdeClient.getInstance();
  return ideClient?.getDetectedIdeDisplayName() ?? '';
}
