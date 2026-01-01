/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import type {
  EvolutionTask,
  TaskCategory,
  TaskDifficulty,
  EvolutionLabConfig,
} from './types.js';
import { DEFAULT_CONFIG } from './types.js';

/**
 * Example prompts for each category.
 */
const PROMPT_TEMPLATES: Record<TaskCategory, string[]> = {
  system_admin: [
    'Check the current system timezone and report it',
    'List all running processes and their memory usage',
    'Check disk usage on all mounted filesystems',
    'Show the current user and their groups',
    'Display system uptime and load average',
    'List all installed packages (use system package manager)',
    'Check if a specific port (8080) is in use',
    'Show environment variables',
    'Display the current hostname',
    'Check available memory and swap',
  ],
  networking: [
    'Check if google.com is reachable via ping',
    'Display the current IP address',
    'Show all network interfaces',
    'Check DNS resolution for example.com',
    'Display routing table',
    'Check which ports are listening',
    'Test if port 443 is open on google.com',
    'Show current network connections',
    'Display the default gateway',
    'Check network latency to 8.8.8.8',
  ],
  gui_automation: [
    'Take a screenshot of the current desktop',
    'Open the file manager application',
    'Open a terminal window',
    'Open the system settings application',
    'Click on the desktop to focus it',
    'Open the web browser',
    'Open a text editor',
    'Minimize all windows',
    'Open the calculator application',
    'Open the application menu',
  ],
  email: [
    'Check if an email client is installed',
    'List mail-related processes',
    'Check mail server connectivity (port 25)',
    'Verify SMTP configuration exists',
    'Check maildir or mbox existence',
  ],
  file_management: [
    'List all files in the current directory',
    'Find all .txt files in home directory',
    'Create a test file with some content',
    'Count the number of files in /tmp',
    'Find files modified in the last 24 hours',
    'List the 10 largest files in home directory',
    'Create a directory structure: test/sub1/sub2',
    'Find all empty directories in home',
    'Check total size of home directory',
    'List hidden files in home directory',
  ],
  web_automation: [
    'Fetch the HTML content of example.com',
    'Check if a website returns 200 OK',
    'Download a file from a URL to /tmp',
    'Check SSL certificate expiry for google.com',
    'Fetch headers from example.com',
    'Check response time of example.com',
    'Verify robots.txt exists on example.com',
    'Check if example.com has a favicon',
  ],
  coding: [
    'Create a Python script that prints Hello World',
    'Write a bash script that lists files',
    'Create a simple Node.js HTTP server file',
    'Write a script that generates a random number',
    'Create a Makefile with a hello target',
    'Write a Python function that reverses a string',
    'Create a shell script that backs up a directory',
    'Write a Python script that reads a JSON file',
    'Create a simple HTML page with CSS',
    'Write a script that calculates factorial',
  ],
};

/**
 * Adversary Agent - Generates synthetic tasks for TerminaI testing.
 */
export class Adversary {
  private config: EvolutionLabConfig;
  private usedPrompts: Set<string> = new Set();

  constructor(config?: Partial<EvolutionLabConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generates a batch of tasks based on category distribution.
   */
  generateBatch(count: number): EvolutionTask[] {
    const tasks: EvolutionTask[] = [];
    const categories = Object.keys(this.config.categories) as TaskCategory[];

    for (let i = 0; i < count; i++) {
      const category = this.selectCategory(categories);
      const task = this.generateTask(category);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Selects a category based on distribution weights.
   */
  private selectCategory(categories: TaskCategory[]): TaskCategory {
    if (categories.length === 0) {
      throw new Error('No task categories configured.');
    }
    const weights = categories.map((c) => this.config.categories[c]);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < categories.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return categories[i];
      }
    }

    return categories[0];
  }

  /**
   * Generates a single task for a given category.
   */
  private generateTask(category: TaskCategory): EvolutionTask | null {
    const templates = PROMPT_TEMPLATES[category];
    const availablePrompts = templates.filter((p) => !this.usedPrompts.has(p));

    if (availablePrompts.length === 0) {
      // Reset if all prompts used
      templates.forEach((p) => this.usedPrompts.delete(p));
      return this.generateTask(category);
    }

    const prompt =
      availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    this.usedPrompts.add(prompt);

    const difficulty = this.assignDifficulty(prompt);

    return {
      taskId: randomUUID(),
      category,
      prompt,
      expectedOutcome: `Successfully executed: ${prompt}`,
      difficulty,
      timeout: this.config.taskTimeout,
    };
  }

  /**
   * Assigns difficulty based on prompt complexity.
   */
  private assignDifficulty(prompt: string): TaskDifficulty {
    const wordCount = prompt.split(' ').length;
    if (wordCount <= 5) return 'easy';
    if (wordCount <= 10) return 'medium';
    return 'hard';
  }

  /**
   * Saves tasks to a JSON file.
   */
  async saveTasks(tasks: EvolutionTask[], outputPath: string): Promise<void> {
    const fs = await import('node:fs/promises');
    await fs.writeFile(outputPath, JSON.stringify(tasks, null, 2), 'utf-8');
  }

  /**
   * Loads tasks from a JSON file.
   */
  async loadTasks(inputPath: string): Promise<EvolutionTask[]> {
    const fs = await import('node:fs/promises');
    const content = await fs.readFile(inputPath, 'utf-8');
    return JSON.parse(content) as EvolutionTask[];
  }
}
