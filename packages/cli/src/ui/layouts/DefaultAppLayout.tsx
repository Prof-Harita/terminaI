/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box } from 'ink';
import { Notifications } from '../components/Notifications.js';
import { MainContent } from '../components/MainContent.js';
import { DialogManager } from '../components/DialogManager.js';
import { Composer } from '../components/Composer.js';
import { ExitWarning } from '../components/ExitWarning.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useFlickerDetector } from '../hooks/useFlickerDetector.js';
import { useAlternateBuffer } from '../hooks/useAlternateBuffer.js';
import { CopyModeWarning } from '../components/CopyModeWarning.js';
import { VoiceOrb } from '../components/VoiceOrb.js';
import { ShellExecutionService } from '@google/gemini-cli-core';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { FullScreenTerminalView } from '../components/FullScreenTerminalView.js';
import { PasswordInputModal } from '../components/PasswordInputModal.js';
import type { AnsiOutput } from '@google/gemini-cli-core';
import { ToolCallStatus } from '../types.js';

export const DefaultAppLayout: React.FC = () => {
  const uiState = useUIState();
  const { clearInteractivePasswordPrompt } = useUIActions();
  const isAlternateBuffer = useAlternateBuffer();

  const { rootUiRef, terminalHeight } = uiState;
  useFlickerDetector(rootUiRef, terminalHeight);

  if (uiState.isFullScreen && uiState.activePtyId) {
    const runningShellTool = uiState.pendingHistoryItems
      .flatMap((item) => (item.type === 'tool_group' ? item.tools : []))
      .find(
        (tool) =>
          tool.status === ToolCallStatus.Executing &&
          tool.name === 'run_shell' &&
          tool.ptyId === uiState.activePtyId,
      );

    const output =
      (runningShellTool?.resultDisplay as AnsiOutput | string | null) ?? null;

    return (
      <FullScreenTerminalView
        ptyId={uiState.activePtyId}
        output={output}
        terminalWidth={uiState.terminalWidth}
        terminalHeight={uiState.terminalHeight}
        onExit={() => {}}
      />
    );
  }
  // If in alternate buffer mode, need to leave room to draw the scrollbar on
  // the right side of the terminal.
  const width = isAlternateBuffer
    ? uiState.terminalWidth
    : uiState.mainAreaWidth;
  return (
    <Box
      flexDirection="column"
      width={width}
      height={isAlternateBuffer ? terminalHeight - 1 : undefined}
      flexShrink={0}
      flexGrow={0}
      overflow="hidden"
      ref={uiState.rootUiRef}
    >
      <VoiceOrb />
      <MainContent />

      <Box
        flexDirection="column"
        ref={uiState.mainControlsRef}
        flexShrink={0}
        flexGrow={0}
      >
        <Notifications />
        <CopyModeWarning />

        {uiState.interactivePasswordPrompt && uiState.activePtyId ? (
          <PasswordInputModal
            prompt={uiState.interactivePasswordPrompt}
            ptyId={uiState.activePtyId}
            onSubmit={() => {
              clearInteractivePasswordPrompt();
            }}
            onCancel={() => {
              ShellExecutionService.writeToPty(uiState.activePtyId!, '\x03');
              clearInteractivePasswordPrompt();
            }}
          />
        ) : uiState.customDialog ? (
          uiState.customDialog
        ) : uiState.dialogsVisible ? (
          <DialogManager
            terminalWidth={uiState.mainAreaWidth}
            addItem={uiState.historyManager.addItem}
          />
        ) : (
          <Composer />
        )}

        <ExitWarning />
      </Box>
    </Box>
  );
};
