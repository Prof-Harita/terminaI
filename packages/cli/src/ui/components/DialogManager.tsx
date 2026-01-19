/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { IdeIntegrationNudge } from '../IdeIntegrationNudge.js';
import { LoopDetectionConfirmation } from './LoopDetectionConfirmation.js';
import { FolderTrustDialog } from './FolderTrustDialog.js';
import { ShellConfirmationDialog } from './ShellConfirmationDialog.js';
import { ConsentPrompt } from './ConsentPrompt.js';
import { ThemeDialog } from './ThemeDialog.js';
import { SettingsDialog } from './SettingsDialog.js';
import { AuthInProgress } from '../auth/AuthInProgress.js';
import { AuthDialog } from '../auth/AuthDialog.js';
import { ApiAuthDialog } from '../auth/ApiAuthDialog.js';
import { ProviderWizard } from '../auth/ProviderWizard.js';
import { OpenAICompatibleSetupDialog } from '../auth/OpenAICompatibleSetupDialog.js';
import { OpenAIChatGptOAuthSetupDialog } from '../auth/OpenAIChatGptOAuthSetupDialog.js';
import { EditorSettingsDialog } from './EditorSettingsDialog.js';
import { PrivacyNotice } from '../privacy/PrivacyNotice.js';
import { ProQuotaDialog } from './ProQuotaDialog.js';
import { runExitCleanup } from '../../utils/cleanup.js';
import { RELAUNCH_EXIT_CODE } from '../../utils/processUtils.js';
import { SessionBrowser } from './SessionBrowser.js';
import { PermissionsModifyTrustDialog } from './PermissionsModifyTrustDialog.js';
import { ModelDialog } from './ModelDialog.js';
import { theme } from '../semantic-colors.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import process from 'node:process';
import { type UseHistoryManagerReturn } from '../hooks/useHistoryManager.js';
import { IdeTrustChangeDialog } from './IdeTrustChangeDialog.js';
import { AuthWizardDialogState, AuthState } from '../types.js';

interface DialogManagerProps {
  addItem: UseHistoryManagerReturn['addItem'];
  terminalWidth: number;
}

// Props for DialogManager
export const DialogManager = ({
  addItem,
  terminalWidth,
}: DialogManagerProps) => {
  const config = useConfig();
  const settings = useSettings();

  const uiState = useUIState();
  const uiActions = useUIActions();
  const { constrainHeight, terminalHeight, staticExtraHeight, mainAreaWidth } =
    uiState;

  if (uiState.showIdeRestartPrompt) {
    return <IdeTrustChangeDialog reason={uiState.ideTrustRestartReason} />;
  }
  if (uiState.proQuotaRequest) {
    return (
      <ProQuotaDialog
        failedModel={uiState.proQuotaRequest.failedModel}
        fallbackModel={uiState.proQuotaRequest.fallbackModel}
        message={uiState.proQuotaRequest.message}
        isTerminalQuotaError={uiState.proQuotaRequest.isTerminalQuotaError}
        isModelNotFoundError={!!uiState.proQuotaRequest.isModelNotFoundError}
        onChoice={uiActions.handleProQuotaChoice}
        userTier={uiState.userTier}
      />
    );
  }
  if (uiState.shouldShowIdePrompt) {
    return (
      <IdeIntegrationNudge
        ide={uiState.currentIDE!}
        onComplete={uiActions.handleIdePromptComplete}
      />
    );
  }
  if (uiState.isFolderTrustDialogOpen) {
    return (
      <FolderTrustDialog
        onSelect={uiActions.handleFolderTrustSelect}
        isRestarting={uiState.isRestarting}
      />
    );
  }
  if (uiState.shellConfirmationRequest) {
    return (
      <ShellConfirmationDialog request={uiState.shellConfirmationRequest} />
    );
  }
  if (uiState.loopDetectionConfirmationRequest) {
    return (
      <LoopDetectionConfirmation
        onComplete={uiState.loopDetectionConfirmationRequest.onComplete}
      />
    );
  }
  if (uiState.confirmationRequest) {
    return (
      <ConsentPrompt
        prompt={uiState.confirmationRequest.prompt}
        onConfirm={uiState.confirmationRequest.onConfirm}
        terminalWidth={terminalWidth}
      />
    );
  }
  if (uiState.confirmUpdateExtensionRequests.length > 0) {
    const request = uiState.confirmUpdateExtensionRequests[0];
    return (
      <ConsentPrompt
        prompt={request.prompt}
        onConfirm={request.onConfirm}
        terminalWidth={terminalWidth}
      />
    );
  }
  if (uiState.authWizardDialog === AuthWizardDialogState.Provider) {
    return (
      <ProviderWizard
        settings={settings}
        onAuthError={uiActions.onAuthError}
        onSelectOpenAICompatible={() => {
          uiActions.setAuthWizardDialog(
            AuthWizardDialogState.OpenAICompatibleSetup,
          );
        }}
        onSelectOpenAIChatGptOauth={() => {
          uiActions.setAuthWizardDialog(
            AuthWizardDialogState.OpenAIChatGptOauthSetup,
          );
        }}
        onProceedToGeminiAuth={async () => {
          // T2.3: Compute new ProviderConfig and reconfigure
          try {
            const { settingsToProviderConfig } = await import(
              '../../config/settingsToProviderConfig.js'
            );
            const { providerConfig } = settingsToProviderConfig(
              settings.merged,
            );
            await config.reconfigureProvider(providerConfig, undefined);
            uiActions.setAuthWizardDialog(null);
            uiActions.closeSettingsDialog();
            // T2.3: For Gemini, set Authenticated directly to avoid double-init
            uiActions.setAuthState(AuthState.Authenticated);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            uiActions.onAuthError(`Failed to switch provider: ${message}`);
          }
        }}
      />
    );
  }

  if (
    uiState.authWizardDialog === AuthWizardDialogState.OpenAICompatibleSetup
  ) {
    return (
      <OpenAICompatibleSetupDialog
        settings={settings}
        terminalWidth={terminalWidth}
        onAuthError={uiActions.onAuthError}
        onBack={() => {
          uiActions.setAuthWizardDialog(AuthWizardDialogState.Provider);
        }}
        onComplete={async () => {
          // T2.3: Compute new ProviderConfig and reconfigure
          try {
            const { settingsToProviderConfig } = await import(
              '../../config/settingsToProviderConfig.js'
            );
            const { AuthType } = await import('@terminai/core');
            const { providerConfig } = settingsToProviderConfig(
              settings.merged,
            );
            await config.reconfigureProvider(
              providerConfig,
              AuthType.USE_OPENAI_COMPATIBLE,
            );
            uiActions.setAuthWizardDialog(null);
            uiActions.closeSettingsDialog();
            // T2.3: For OpenAI-compatible, set Authenticated directly to avoid double-init
            uiActions.setAuthState(AuthState.Authenticated);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            uiActions.onAuthError(
              `Failed to configure OpenAI provider: ${message}`,
            );
          }
        }}
      />
    );
  }

  if (
    uiState.authWizardDialog === AuthWizardDialogState.OpenAIChatGptOauthSetup
  ) {
    return (
      <OpenAIChatGptOAuthSetupDialog
        settings={settings}
        terminalWidth={terminalWidth}
        onAuthError={uiActions.onAuthError}
        onBack={() => {
          uiActions.setAuthWizardDialog(AuthWizardDialogState.Provider);
        }}
        onComplete={async () => {
          try {
            const { settingsToProviderConfig } = await import(
              '../../config/settingsToProviderConfig.js'
            );
            const { AuthType } = await import('@terminai/core');
            const { providerConfig } = settingsToProviderConfig(
              settings.merged,
            );
            await config.reconfigureProvider(
              providerConfig,
              AuthType.USE_OPENAI_CHATGPT_OAUTH,
            );
            uiActions.setAuthWizardDialog(null);
            uiActions.closeSettingsDialog();
            uiActions.setAuthState(AuthState.Authenticated);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            uiActions.onAuthError(
              `Failed to configure ChatGPT OAuth provider: ${message}`,
            );
          }
        }}
      />
    );
  }

  if (uiState.isThemeDialogOpen) {
    return (
      <Box flexDirection="column">
        {uiState.themeError && (
          <Box marginBottom={1}>
            <Text color={theme.status.error}>{uiState.themeError}</Text>
          </Box>
        )}
        <ThemeDialog
          onSelect={uiActions.handleThemeSelect}
          onCancel={uiActions.closeThemeDialog}
          onHighlight={uiActions.handleThemeHighlight}
          settings={settings}
          availableTerminalHeight={
            constrainHeight ? terminalHeight - staticExtraHeight : undefined
          }
          terminalWidth={mainAreaWidth}
        />
      </Box>
    );
  }
  if (uiState.isSettingsDialogOpen) {
    return (
      <Box flexDirection="column">
        <SettingsDialog
          settings={settings}
          onSelect={() => uiActions.closeSettingsDialog()}
          onRestartRequest={async () => {
            await runExitCleanup();
            process.exit(RELAUNCH_EXIT_CODE);
          }}
          availableTerminalHeight={terminalHeight - staticExtraHeight}
          config={config}
          onOpenAuthWizard={() => {
            uiActions.setAuthWizardDialog(AuthWizardDialogState.Provider);
          }}
        />
      </Box>
    );
  }
  if (uiState.isModelDialogOpen) {
    return <ModelDialog onClose={uiActions.closeModelDialog} />;
  }

  if (uiState.isAuthenticating) {
    return (
      <AuthInProgress
        onTimeout={() => {
          uiActions.onAuthError('Authentication cancelled.');
        }}
      />
    );
  }
  if (uiState.isAwaitingApiKeyInput) {
    return (
      <Box flexDirection="column">
        <ApiAuthDialog
          key={uiState.apiKeyDefaultValue}
          onSubmit={uiActions.handleApiKeySubmit}
          onCancel={uiActions.handleApiKeyCancel}
          error={uiState.authError}
          defaultValue={uiState.apiKeyDefaultValue}
        />
      </Box>
    );
  }
  if (uiState.isAuthDialogOpen) {
    return (
      <Box flexDirection="column">
        <AuthDialog
          config={config}
          settings={settings}
          setAuthState={uiActions.setAuthState}
          authError={uiState.authError}
          onAuthError={uiActions.onAuthError}
        />
      </Box>
    );
  }
  if (uiState.isEditorDialogOpen) {
    return (
      <Box flexDirection="column">
        {uiState.editorError && (
          <Box marginBottom={1}>
            <Text color={theme.status.error}>{uiState.editorError}</Text>
          </Box>
        )}
        <EditorSettingsDialog
          onSelect={uiActions.handleEditorSelect}
          settings={settings}
          onExit={uiActions.exitEditorDialog}
        />
      </Box>
    );
  }
  if (uiState.showPrivacyNotice) {
    return (
      <PrivacyNotice
        onExit={() => uiActions.exitPrivacyNotice()}
        config={config}
      />
    );
  }
  if (uiState.isSessionBrowserOpen) {
    return (
      <SessionBrowser
        config={config}
        onResumeSession={uiActions.handleResumeSession}
        onDeleteSession={uiActions.handleDeleteSession}
        onExit={uiActions.closeSessionBrowser}
      />
    );
  }

  if (uiState.isPermissionsDialogOpen) {
    return (
      <PermissionsModifyTrustDialog
        onExit={uiActions.closePermissionsDialog}
        addItem={addItem}
        targetDirectory={uiState.permissionsDialogProps?.targetDirectory}
      />
    );
  }

  return null;
};
