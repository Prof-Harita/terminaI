/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { RadioButtonSelect } from '../components/shared/RadioButtonSelect.js';
import type { LoadedSettings } from '../../config/settings.js';
import { SettingScope } from '../../config/settings.js';
import {
  buildWizardSettingsPatch,
  type ProviderId,
  AuthType,
} from '@terminai/core';

interface Props {
  settings: LoadedSettings;
  onSelectOpenAICompatible: () => void;
  onSelectOpenAIChatGptOauth: () => void;
  onProceedToGeminiAuth: () => void | Promise<void>;
  onAuthError: (error: string | null) => void;
}

export function ProviderWizard({
  settings,
  onSelectOpenAICompatible,
  onSelectOpenAIChatGptOauth,
  onProceedToGeminiAuth,
  onAuthError,
}: Props) {
  const isOpenAiChatGptOauthDisabled = (() => {
    const raw = process.env['TERMINAI_DISABLE_OPENAI_CHATGPT_OAUTH'];
    if (raw === undefined) return false;
    const normalized = raw.trim().toLowerCase();
    return (
      normalized === '1' ||
      normalized === 'true' ||
      normalized === 'yes' ||
      normalized === 'on'
    );
  })();

  const targetScope = (() => {
    const workspaceSettings = settings.forScope(
      SettingScope.Workspace,
    ).settings;
    const hasWorkspaceOverride =
      workspaceSettings.llm?.provider !== undefined ||
      workspaceSettings.llm?.openaiCompatible !== undefined;
    return hasWorkspaceOverride ? SettingScope.Workspace : SettingScope.User;
  })();

  const applyPatches = (patches: Array<{ path: string; value: unknown }>) => {
    for (const patch of patches) {
      settings.setValue(targetScope, patch.path, patch.value);
    }
  };

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.focused}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold color={theme.text.primary}>
        Choose your model provider
      </Text>
      {targetScope === SettingScope.Workspace && (
        <Box marginTop={1}>
          <Text color="yellow">
            ⚠️ Workspace settings detected - selection will apply to this
            project only.
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.text.primary}>
          TerminaI can use different providers. Select one to continue:
        </Text>
      </Box>
      <Box marginTop={1}>
        <RadioButtonSelect<ProviderId>
          items={[
            {
              label: 'Google Gemini',
              value: 'gemini',
              key: 'gemini',
            },
            ...(isOpenAiChatGptOauthDisabled
              ? []
              : [
                  {
                    label: 'ChatGPT Plus/Pro (OAuth)',
                    value: 'openai_chatgpt_oauth',
                    key: 'openai_chatgpt_oauth',
                  } as const,
                ]),
            {
              label: 'OpenAI Compatible',
              value: 'openai_compatible',
              key: 'openai_compatible',
            },
            {
              label: 'Anthropic (Coming soon)',
              value: 'anthropic',
              key: 'anthropic',
              disabled: true,
            },
          ]}
          onSelect={(provider) => {
            onAuthError(null);

            if (provider === 'openai_compatible') {
              onSelectOpenAICompatible();
              return;
            }

            if (provider === 'openai_chatgpt_oauth') {
              onSelectOpenAIChatGptOauth();
              return;
            }

            if (provider === 'anthropic') {
              onAuthError('Anthropic is not yet supported.');
              return;
            }

            // Gemini: persist provider selection with explicit auth type for hot-swap
            applyPatches(
              buildWizardSettingsPatch({
                provider: 'gemini',
                geminiAuthType: AuthType.LOGIN_WITH_GOOGLE,
              }),
            );

            void onProceedToGeminiAuth();
          }}
          onHighlight={() => {
            onAuthError(null);
          }}
        />
      </Box>
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>(Use Enter to select)</Text>
      </Box>
    </Box>
  );
}
