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
import { buildWizardSettingsPatch, type ProviderId } from '@terminai/core';

interface Props {
  settings: LoadedSettings;
  onSelectOpenAICompatible: () => void;
  onProceedToGeminiAuth: () => void | Promise<void>;
  onAuthError: (error: string | null) => void;
}

export function ProviderWizard({
  settings,
  onSelectOpenAICompatible,
  onProceedToGeminiAuth,
  onAuthError,
}: Props) {
  const applyPatches = (patches: Array<{ path: string; value: unknown }>) => {
    for (const patch of patches) {
      settings.setValue(SettingScope.User, patch.path, patch.value);
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

            if (provider === 'anthropic') {
              onAuthError('Anthropic is not yet supported.');
              return;
            }

            // Gemini: persist provider selection, then proceed to existing auth dialog.
            applyPatches(buildWizardSettingsPatch({ provider: 'gemini' }));

            // 2.2 Fix: Clear OpenAI auth type if present to avoid inconsistent state
            const currentAuthType =
              settings.merged.security?.auth?.selectedType;
            if (currentAuthType === 'openai-compatible') {
              settings.setValue(
                SettingScope.User,
                'security.auth.selectedType',
                undefined,
              );
            }

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
