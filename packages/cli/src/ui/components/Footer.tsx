/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { shortenPath, tildeifyPath, getDisplayString } from '@terminai/core';
import { ConsoleSummaryDisplay } from './ConsoleSummaryDisplay.js';
import process from 'node:process';
import { ThemedGradient } from './ThemedGradient.js';
import { MemoryUsageDisplay } from './MemoryUsageDisplay.js';
import { ContextUsageDisplay } from './ContextUsageDisplay.js';
import { DebugProfiler } from './DebugProfiler.js';
import { isDevelopment } from '../../utils/installationInfo.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useVimMode } from '../contexts/VimModeContext.js';

export const Footer: React.FC = () => {
  const uiState = useUIState();
  const config = useConfig();
  const settings = useSettings();
  const { vimEnabled, vimMode } = useVimMode();

  const {
    currentModel: model,
    branchName,
    debugMessage,
    corgiMode,
    errorCount,
    showErrorDetails,
    nightly,
    isTrustedFolder,
    mainAreaWidth,
    viewMode,
  } = uiState;

  const targetDir = config.getTargetDir();
  const debugMode = config.getDebugMode();
  const promptTokenCount = uiState.sessionStats.lastPromptTokenCount;

  const showMemoryUsage =
    (config.getDebugMode() || settings.merged.ui?.showMemoryUsage || false) &&
    viewMode !== 'focus';
  const hideCWD = settings.merged.ui?.footer?.hideCWD || false;
  const hideSandboxStatus =
    settings.merged.ui?.footer?.hideSandboxStatus ||
    false ||
    viewMode === 'focus';
  const hideModelInfo = settings.merged.ui?.footer?.hideModelInfo || false;
  const hideContextPercentage =
    (settings.merged.ui?.footer?.hideContextPercentage ?? true) ||
    viewMode === 'focus';

  const pathLength = Math.max(20, Math.floor(mainAreaWidth * 0.25));
  const displayPath = shortenPath(tildeifyPath(targetDir), pathLength);

  const justifyContent = hideCWD && hideModelInfo ? 'center' : 'space-between';
  const displayVimMode = vimEnabled ? vimMode : undefined;

  const showDebugProfiler = debugMode || isDevelopment;

  return (
    <Box
      justifyContent={justifyContent}
      width={mainAreaWidth}
      flexDirection="row"
      alignItems="center"
      paddingX={1}
    >
      {(showDebugProfiler || displayVimMode || !hideCWD) && (
        <Box>
          {showDebugProfiler && <DebugProfiler />}
          {displayVimMode && (
            <Text color={theme.text.secondary}>[{displayVimMode}] </Text>
          )}
          {!hideCWD &&
            (nightly ? (
              <ThemedGradient>
                {displayPath}
                {branchName && <Text> ({branchName}*)</Text>}
              </ThemedGradient>
            ) : (
              <Text color={theme.text.link}>
                {displayPath}
                {branchName && (
                  <Text color={theme.text.secondary}> ({branchName}*)</Text>
                )}
              </Text>
            ))}
          {debugMode && (
            <Text color={theme.status.error}>
              {' ' + (debugMessage || '--debug')}
            </Text>
          )}
        </Box>
      )}

      {/* Middle Section: Centered Trust/Sandbox Info */}
      {!hideSandboxStatus && (
        <Box
          flexGrow={1}
          alignItems="center"
          justifyContent="center"
          display="flex"
        >
          {isTrustedFolder === false ? (
            <Text color={theme.status.warning}>untrusted</Text>
          ) : process.env['SANDBOX'] &&
            process.env['SANDBOX'] !== 'sandbox-exec' ? (
            <Text color="green">
              {process.env['SANDBOX'].replace(/^gemini-(?:cli-)?/, '')}
            </Text>
          ) : process.env['SANDBOX'] === 'sandbox-exec' ? (
            <Text color={theme.status.warning}>
              macOS Seatbelt{' '}
              <Text color={theme.text.secondary}>
                ({process.env['SEATBELT_PROFILE']})
              </Text>
            </Text>
          ) : (
            <Text color={theme.status.error}>
              no sandbox
              {mainAreaWidth >= 100 && (
                <Text color={theme.text.secondary}> (see /docs)</Text>
              )}
            </Text>
          )}
        </Box>
      )}

      {/* Right Section: Gemini Label and Console Summary */}
      {!hideModelInfo && (
        <Box alignItems="center" justifyContent="flex-end">
          <Box alignItems="center">
            {/* Brain Mode Indicator */}
            <Text
              color={
                config.experimentalBrainFrameworks
                  ? theme.text.accent
                  : theme.text.secondary
              }
            >
              {config.experimentalBrainFrameworks ? 'Deep' : 'Fast'}
              <Text color={theme.text.secondary}> /think </Text>
            </Text>
            <Text color={theme.text.accent}>
              {getDisplayString(model, config.getPreviewFeatures())}
              <Text color={theme.text.secondary}> /model</Text>
              {!hideContextPercentage && (
                <>
                  {' '}
                  <ContextUsageDisplay
                    promptTokenCount={promptTokenCount}
                    model={model}
                    terminalWidth={mainAreaWidth}
                  />
                </>
              )}
            </Text>
            {showMemoryUsage && <MemoryUsageDisplay />}
          </Box>
          <Box alignItems="center">
            {corgiMode && viewMode !== 'focus' && (
              <Box paddingLeft={1} flexDirection="row">
                <Text>
                  <Text color={theme.ui.symbol}>| </Text>
                  <Text color={theme.status.error}>▼</Text>
                  <Text color={theme.text.primary}>(´</Text>
                  <Text color={theme.status.error}>ᴥ</Text>
                  <Text color={theme.text.primary}>`)</Text>
                  <Text color={theme.status.error}>▼</Text>
                </Text>
              </Box>
            )}
            {!showErrorDetails && errorCount > 0 && (
              <Box paddingLeft={1} flexDirection="row">
                <Text color={theme.ui.comment}>| </Text>
                <ConsoleSummaryDisplay errorCount={errorCount} />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
