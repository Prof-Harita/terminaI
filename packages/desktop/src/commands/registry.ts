/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DesktopCommand, CommandContext } from './types';

export class CommandRegistry {
  private commands = new Map<string, DesktopCommand>();

  register(command: DesktopCommand): void {
    this.commands.set(command.name, command);
  }

  get(name: string): DesktopCommand | undefined {
    return this.commands.get(name);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Simple tokenizer.
   * Implementation: text.trim().split(/\s+/)
   * Note: We avoid 'yargs-parser' in browser to minimize polyfills.
   */
  parse(text: string): { command: string; args: string[] } | null {
    if (!text.startsWith('/')) {
      return null;
    }

    const trimmed = text.trim();
    if (trimmed === '/') {
      return null;
    }

    const parts = trimmed.slice(1).split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    return { command: commandName, args };
  }

  async execute(
    name: string,
    args: string[],
    context: CommandContext,
  ): Promise<void> {
    const command = this.get(name);
    if (!command) {
      throw new Error(`Command '/${name}' not found.`);
    }

    try {
      await command.execute(args, context);
    } catch (error) {
      console.error(`Error executing command /${name}:`, error);
      context.ui.appendSystemMessage(
        `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const commandRegistry = new CommandRegistry();
