/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box } from 'ink';
import { Notifications } from '../components/Notifications.js';
import { DialogManager } from '../components/DialogManager.js';
import { DialogLayer } from './DialogLayer.js';
import { SessionView } from '../views/SessionView.js';
import { ZenView } from '../views/ZenView.js';
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

  // ZenView for focus mode - full screen centered
  if (uiState.viewMode === 'focus') {
    return (
      <Box
        width={uiState.terminalWidth}
        height={isAlternateBuffer ? terminalHeight - 1 : undefined}
        ref={uiState.rootUiRef}
      >
        <ZenView />
        <DialogLayer />
      </Box>
    );
  }

  // Standard/Session Layout (Clean Split View like OpenCode)
  const width = isAlternateBuffer
    ? uiState.terminalWidth
    : uiState.mainAreaWidth;
  const marginLeft = isAlternateBuffer
    ? 0
    : Math.floor((uiState.terminalWidth - width) / 2);

  return (
    <Box
      marginLeft={Math.max(0, marginLeft)}
      flexDirection="column"
      width={width}
      height={terminalHeight - 1}
      flexShrink={0}
      flexGrow={0}
      overflow="hidden"
      ref={uiState.rootUiRef}
    >
      <VoiceOrb />

      {/* 
        Classic Vertical Layout (nano/htop style)
        Top: Session (Messages) - Grows to fill space
        Bottom: Input - Fixed height
      */}
      <Box flexGrow={1} width="100%" flexDirection="column" overflow="hidden">
        <SessionView />
      </Box>

      {/* Minimal Footer / Input Area */}
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
      <DialogLayer />
    </Box>
  );
};
