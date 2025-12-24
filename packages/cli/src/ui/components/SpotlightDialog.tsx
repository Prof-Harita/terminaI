/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useUIState } from '../contexts/UIStateContext.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { theme } from '../semantic-colors.js';

interface SpotlightItem {
  label: string;
  execute: () => void;
}

export const SpotlightDialog = () => {
  const { isSpotlightOpen, shellModeActive } = useUIState();
  const { setSpotlightOpen, setViewMode, setShellModeActive } = useUIActions();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define available commands
  const items: SpotlightItem[] = useMemo(() => {
    const list: SpotlightItem[] = [
      { label: 'View: Focus Mode', execute: () => setViewMode('focus') },
      { label: 'View: Standard Mode', execute: () => setViewMode('standard') },
      {
        label: 'View: Multiplex Mode',
        execute: () => setViewMode('multiplex'),
      },
      {
        label: shellModeActive ? 'Disable Shell Mode' : 'Enable Shell Mode',
        execute: () => setShellModeActive(!shellModeActive),
      },
    ];
    // Filter based on query
    if (!query) return list;
    return list.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query, setViewMode, shellModeActive, setShellModeActive]);

  useInput((input, key) => {
    if (!isSpotlightOpen) return;

    if (key.escape) {
      setSpotlightOpen(false);
      return;
    }

    if (key.return) {
      if (items[selectedIndex]) {
        items[selectedIndex].execute();
        setSpotlightOpen(false);
        // Reset state for next time
        setQuery('');
        setSelectedIndex(0);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
      return;
    }

    if (key.backspace || key.delete) {
      setQuery((prev) => prev.slice(0, -1));
      setSelectedIndex(0);
      return;
    }

    // Ignore control interactions for text input
    if (key.ctrl || key.meta) return;

    if (input) {
      setQuery((prev) => prev + input);
      setSelectedIndex(0);
    }
  });

  if (!isSpotlightOpen) return null;

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        borderStyle="double"
        borderColor={theme.border.focused}
        flexDirection="column"
        width={80}
        maxHeight={20}
        paddingX={1}
        paddingY={0}
      >
        <Box
          borderStyle="single"
          borderColor={theme.border.default}
          width="100%"
          paddingX={1}
          marginBottom={1}
        >
          <Text color={theme.text.primary}>{query}</Text>
          <Text dimColor>_</Text>
        </Box>

        <Box flexDirection="column">
          {items.map((item, idx) => (
            <Box key={idx} paddingX={1}>
              <Text
                color={
                  idx === selectedIndex ? theme.text.accent : theme.text.primary
                }
                backgroundColor={
                  idx === selectedIndex ? theme.ui.dark : undefined
                }
                wrap="truncate-end"
              >
                {idx === selectedIndex ? '> ' : '  '}
                {item.label}
              </Text>
            </Box>
          ))}
          {items.length === 0 && (
            <Box paddingX={1}>
              <Text color={theme.text.secondary}>No results found.</Text>
            </Box>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color={theme.ui.comment} dimColor>
            Use up/down to navigate, enter to select, esc to close.
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
