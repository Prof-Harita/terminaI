/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { type SlashCommand, CommandKind } from '../commands/types.js';
import {
  LEFT_COLUMN_CATEGORIES,
  RIGHT_COLUMN_CATEGORIES,
  type CommandCategoryType,
} from '../commands/categories.js';

interface HelpProps {
  commands: readonly SlashCommand[];
  showAll?: boolean;
}

// Group commands by category
function groupByCategory(
  commands: readonly SlashCommand[],
  showAll: boolean,
): Map<CommandCategoryType, SlashCommand[]> {
  const groups = new Map<CommandCategoryType, SlashCommand[]>();

  // Initialize all categories
  for (const cat of [...LEFT_COLUMN_CATEGORIES, ...RIGHT_COLUMN_CATEGORIES]) {
    groups.set(cat, []);
  }

  for (const cmd of commands) {
    // Skip hidden commands unless showAll is true
    if (cmd.hidden && !showAll) continue;
    // Skip commands without description
    if (!cmd.description) continue;

    // Skip commands with no category (e.g. dynamic MCP prompts)
    const category = cmd.category as CommandCategoryType;
    if (!category) continue;

    const group = groups.get(category) || [];
    group.push(cmd);
    groups.set(category, group);
  }

  return groups;
}

// Render a single command
const CommandItem: React.FC<{ command: SlashCommand; showAll: boolean }> = ({
  command,
  showAll,
}) => (
  <Box flexDirection="column">
    <Text color={theme.text.primary}>
      <Text bold color={theme.text.accent}>
        {' '}
        /{command.name}
      </Text>
      {command.kind === CommandKind.MCP_PROMPT && (
        <Text color={theme.text.secondary}> [MCP]</Text>
      )}
      {command.hidden && <Text color={theme.text.secondary}> [hidden]</Text>}
      {command.description && ' - ' + command.description}
    </Text>
    {command.subCommands &&
      command.subCommands
        .filter((subCmd) => !subCmd.hidden || showAll)
        .map((subCmd) => (
          <Text key={subCmd.name} color={theme.text.primary}>
            <Text bold color={theme.text.accent}>
              {'   '}
              {subCmd.name}
            </Text>
            {subCmd.description && ' - ' + subCmd.description}
          </Text>
        ))}
  </Box>
);

// Render a category section
const CategorySection: React.FC<{
  name: CommandCategoryType;
  commands: SlashCommand[];
  showAll: boolean;
}> = ({ name, commands, showAll }) => {
  if (commands.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={theme.text.primary}>
        {name}:
      </Text>
      {commands.map((cmd) => (
        <CommandItem key={cmd.name} command={cmd} showAll={showAll} />
      ))}
    </Box>
  );
};

export const Help: React.FC<HelpProps> = ({ commands, showAll = false }) => {
  const grouped = groupByCategory(commands, showAll);

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderColor={theme.border.default}
      borderStyle="round"
      padding={1}
    >
      {/* Basics */}
      <Text bold color={theme.text.primary}>
        Basics:
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          Add context
        </Text>
        : Use{' '}
        <Text bold color={theme.text.accent}>
          @
        </Text>{' '}
        to specify files for context (e.g.,{' '}
        <Text bold color={theme.text.accent}>
          @src/myFile.ts
        </Text>
        ) to target specific files or folders.
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          Shell mode
        </Text>
        : Execute shell commands via{' '}
        <Text bold color={theme.text.accent}>
          !
        </Text>{' '}
        (e.g.,{' '}
        <Text bold color={theme.text.accent}>
          !npm run start
        </Text>
        ) or use natural language (e.g.{' '}
        <Text bold color={theme.text.accent}>
          start server
        </Text>
        ).
      </Text>

      <Box height={1} />

      {/* Two-column categorized commands */}
      <Text bold color={theme.text.primary}>
        Commands{showAll ? ' (all)' : ''}:
      </Text>
      <Box flexDirection="row" width="100%">
        {/* Left column */}
        <Box flexDirection="column" flexGrow={1} marginRight={2}>
          {LEFT_COLUMN_CATEGORIES.map((cat) => (
            <CategorySection
              key={cat}
              name={cat}
              commands={grouped.get(cat) || []}
              showAll={showAll}
            />
          ))}
        </Box>
        {/* Right column */}
        <Box flexDirection="column" flexGrow={1}>
          {RIGHT_COLUMN_CATEGORIES.map((cat) => (
            <CategorySection
              key={cat}
              name={cat}
              commands={grouped.get(cat) || []}
              showAll={showAll}
            />
          ))}
        </Box>
      </Box>

      {/* Shell and MCP notes */}
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          {' '}
          !{' '}
        </Text>
        - shell command
      </Text>
      <Text color={theme.text.primary}>
        <Text color={theme.text.secondary}>[MCP]</Text> - Model Context Protocol
        command (from external servers)
      </Text>
      {showAll && (
        <Text color={theme.text.secondary}>
          [hidden] - Internal command (aliased or deprecated)
        </Text>
      )}

      <Box height={1} />

      {/* Shortcuts */}
      <Text bold color={theme.text.primary}>
        Keyboard Shortcuts:
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          Ctrl+C
        </Text>{' '}
        - Quit application
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          {process.platform === 'win32' ? 'Ctrl+Enter' : 'Ctrl+J'}
        </Text>{' '}
        {process.platform === 'linux'
          ? '- New line (Alt+Enter works for certain linux distros)'
          : '- New line'}
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          Ctrl+L
        </Text>{' '}
        - Clear the screen
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          Ctrl+S
        </Text>{' '}
        - Enter selection mode to copy text
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          Ctrl+Y
        </Text>{' '}
        - Toggle YOLO mode
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          Esc
        </Text>{' '}
        - Cancel operation / Clear input (double press)
      </Text>
      <Text color={theme.text.primary}>
        <Text bold color={theme.text.accent}>
          Up/Down
        </Text>{' '}
        - Cycle through your prompt history
      </Text>
      <Box height={1} />
      <Text color={theme.text.primary}>
        For a full list of shortcuts, see{' '}
        <Text bold color={theme.text.accent}>
          terminai.org/docs/shortcuts
        </Text>
      </Text>
      {!showAll && (
        <Text color={theme.text.secondary}>
          Tip: Use /help all to see all commands including hidden ones.
        </Text>
      )}
    </Box>
  );
};
