/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box } from 'ink';
import { HistoryItemDisplay } from './HistoryItemDisplay.js';
import { ShowMoreLines } from './ShowMoreLines.js';
import { OverflowProvider } from '../contexts/OverflowContext.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { SCROLL_TO_ITEM_END } from './shared/VirtualizedList.js';
import { ScrollableList } from './shared/ScrollableList.js';
import { useMemo, memo, useCallback } from 'react';
import { MAX_GEMINI_MESSAGE_LINES } from '../constants.js';

const MemoizedHistoryItemDisplay = memo(HistoryItemDisplay);

// Limit Gemini messages to a very high number of lines to mitigate performance
// issues in the worst case if we somehow get an enormous response from Gemini.
// This threshold is arbitrary but should be high enough to never impact normal
// usage.
export const MainContent = () => {
  const uiState = useUIState();

  const {
    pendingHistoryItems,
    mainAreaWidth,
    staticAreaMaxItemHeight,
    availableTerminalHeight,
  } = uiState;

  const pendingItems = useMemo(
    () => (
      <OverflowProvider>
        <Box flexDirection="column">
          {pendingHistoryItems.map((item, i) => (
            <HistoryItemDisplay
              key={i}
              availableTerminalHeight={
                uiState.constrainHeight ? availableTerminalHeight : undefined
              }
              terminalWidth={mainAreaWidth}
              item={{ ...item, id: 0 }}
              isPending={true}
              isFocused={!uiState.isEditorDialogOpen}
              activeShellPtyId={uiState.activePtyId}
              embeddedShellFocused={uiState.embeddedShellFocused}
            />
          ))}
          <ShowMoreLines constrainHeight={uiState.constrainHeight} />
        </Box>
      </OverflowProvider>
    ),
    [
      pendingHistoryItems,
      uiState.constrainHeight,
      availableTerminalHeight,
      mainAreaWidth,
      uiState.isEditorDialogOpen,
      uiState.activePtyId,
      uiState.embeddedShellFocused,
    ],
  );

  const virtualizedData = useMemo(
    () => [
      ...uiState.history.map((item) => ({ type: 'history' as const, item })),
      { type: 'pending' as const },
    ],
    [uiState.history],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof virtualizedData)[number] }) => {
      if (item.type === 'history') {
        return (
          <MemoizedHistoryItemDisplay
            terminalWidth={mainAreaWidth}
            availableTerminalHeight={staticAreaMaxItemHeight}
            availableTerminalHeightGemini={MAX_GEMINI_MESSAGE_LINES}
            key={item.item.id}
            item={item.item}
            isPending={false}
            commands={uiState.slashCommands}
          />
        );
      } else {
        return pendingItems;
      }
    },
    [
      mainAreaWidth,
      staticAreaMaxItemHeight,
      uiState.slashCommands,
      pendingItems,
    ],
  );

  return (
    <ScrollableList
      hasFocus={!uiState.isEditorDialogOpen}
      data={virtualizedData}
      renderItem={renderItem}
      estimatedItemHeight={() => 100}
      keyExtractor={(item, _index) => {
        if (item.type === 'history') return item.item.id.toString();
        return 'pending';
      }}
      initialScrollIndex={SCROLL_TO_ITEM_END}
      initialScrollOffsetInIndex={SCROLL_TO_ITEM_END}
    />
  );
};
