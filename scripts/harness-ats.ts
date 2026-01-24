/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
// import * as os from 'node:os';
import { atsTasks } from './data/ats-tasks';

// Configuration
const SCOREBOARD_PATH = path.join(
  process.cwd(),
  'docs-terminai/roadmap/scoreboard.md',
);

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

// Types
interface TaskResult {
  taskId: string;
  runtime: string;
  session: string;
  result: 'PASS' | 'FAIL' | 'PARTIAL';
  notes: string;
  actions: string;
}

interface ScoreboardRow {
  id: string;
  title: string;
  runtime: string;
  session: string;
  result: string;
  notes: string;
  actions: string;
}

// Helpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function printHeader(task: any) {
  console.clear();
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.bright}ATS-${task.id}: ${task.title}${colors.reset}`);
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`\n${colors.bright}PROMPT:${colors.reset}\n${task.prompt}\n`);
  console.log(
    `${colors.bright}${colors.blue}EVIDENCE (PASS):${colors.reset}\n${task.evidence}\n`,
  );
  console.log(
    `${colors.bright}${colors.red}FAILURE CONDITIONS:${colors.reset}\n${task.failure}\n`,
  );
  console.log(
    `${colors.yellow}Starting TerminAI... (Type '/exit' or Ctrl+C to finish grading)${colors.reset}\n`,
  );
}

async function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function readScoreboard(): ScoreboardRow[] {
  if (!fs.existsSync(SCOREBOARD_PATH)) return [];
  const content = fs.readFileSync(SCOREBOARD_PATH, 'utf-8');
  const lines = content.split('\n');
  const rows: ScoreboardRow[] = [];

  for (const line of lines) {
    const match = line.match(/^\|\s*(\d+)\s*\|/);
    if (match) {
      const parts = line.split('|').map((p) => p.trim());
      rows.push({
        id: parts[1],
        title: parts[2] || '',
        runtime: parts[3] || '',
        session: parts[4] || '',
        result: parts[5] || '',
        notes: parts[6] || '',
        actions: parts[7] || '',
      });
    }
  }
  return rows;
}

function updateScoreboard(result: TaskResult) {
  if (!fs.existsSync(SCOREBOARD_PATH)) {
    console.error(
      `${colors.red}Error: Scoreboard not found at ${SCOREBOARD_PATH}${colors.reset}`,
    );
    return;
  }

  const content = fs.readFileSync(SCOREBOARD_PATH, 'utf-8');
  const lines = content.split('\n');
  const tableStart = lines.findIndex((l) => l.match(/^\|\s*ID\s*\|\s*Task/));

  if (tableStart === -1) {
    console.error(
      `${colors.red}Error: Could not find table in scoreboard${colors.reset}`,
    );
    return;
  }

  // Symbol mapping
  const symbols = {
    PASS: '✅',
    FAIL: '❌',
    PARTIAL: '⚠️',
  };

  const newLines = lines.map((line) => {
    const match = line.match(/^\|\s*(\d+)\s*\|/);
    if (match && match[1] === result.taskId) {
      const parts = line.split('|').map((p) => p.trim());

      const title = parts[2];
      const runtime = result.runtime || parts[3];
      const session = result.session || parts[4];
      const symbol = symbols[result.result] || '⏳';
      const notes = result.notes.replace(/\|/g, '-') || parts[6] || '';
      const actions = result.actions.replace(/\|/g, '-') || parts[7] || '';

      return `| ${result.taskId.padEnd(3)} | ${title.padEnd(50)} | ${runtime.padEnd(7)} | ${session.padEnd(36)} | ${symbol.padEnd(6)} | ${notes.padEnd(20)} | ${actions.padEnd(20)} |`;
    }
    return line;
  });

  fs.writeFileSync(SCOREBOARD_PATH, newLines.join('\n'));
  console.log(`${colors.green}Scoreboard updated!${colors.reset}`);
}

async function runTask(taskId: string) {
  const task = atsTasks.find((t) => t.id === taskId);
  if (!task) {
    console.error(`${colors.red}Task ${taskId} not found${colors.reset}`);
    return;
  }

  printHeader(task);

  const startTime = new Date();

  // Spawn TerminAI
  const child = spawn('npm', ['start', '--', '-i', task.prompt], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '3' },
  });

  await new Promise<void>((resolve) => {
    child.on('exit', () => resolve());
    child.on('error', (err) => {
      console.error('Failed to start process:', err);
      resolve();
    });
  });

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const runtime = `${Math.round(durationMs / 1000)}s`;

  console.log(
    `\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.bright}GRADING: ATS-${taskId}${colors.reset}`);

  // 1. Result
  const resultInput = await askQuestion(
    `${colors.yellow}Result (p/pass, f/fail, w/warn/partial)? ${colors.reset}`,
  );
  let result: 'PASS' | 'FAIL' | 'PARTIAL' = 'FAIL';
  if (resultInput.toLowerCase().startsWith('p')) result = 'PASS';
  if (resultInput.toLowerCase().startsWith('w')) result = 'PARTIAL';

  // 2. Session ID (from the summary output above)
  const sessionInput = await askQuestion(
    `${colors.yellow}Session ID (from summary above): ${colors.reset}`,
  );

  // 3. Notes
  const notes = await askQuestion(
    `${colors.yellow}Notes (one line): ${colors.reset}`,
  );

  // 4. Action Items (if failed)
  let actions = '';
  if (result !== 'PASS') {
    actions = await askQuestion(
      `${colors.yellow}Outstanding fixes (for Agent to fix later): ${colors.reset}`,
    );
  }

  updateScoreboard({
    taskId,
    runtime,
    session: sessionInput,
    result,
    notes,
    actions,
  });
}

async function analyzeTask(taskId: string) {
  const id = taskId.padStart(2, '0');
  const task = atsTasks.find((t) => t.id === id);
  const rows = readScoreboard();
  const row = rows.find((r) => r.id === id);

  if (!task) {
    console.error(
      `${colors.red}Task ${id} not found in definitions${colors.reset}`,
    );
    return;
  }

  if (!row) {
    console.error(
      `${colors.red}Task ${id} not found in scoreboard${colors.reset}`,
    );
    return;
  }

  console.log(
    `\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.bright}ANALYZING: ATS-${id}${colors.reset}`);
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`\n${colors.bright}TASK:${colors.reset} ${task.title}`);
  console.log(`${colors.bright}PROMPT:${colors.reset} ${task.prompt}`);
  console.log(`${colors.bright}EVIDENCE:${colors.reset}\n${task.evidence}`);
  console.log(
    `${colors.bright}FAILURE CONDITIONS:${colors.reset}\n${task.failure}`,
  );
  console.log(`\n${colors.bright}RECORDED RESULT:${colors.reset}`);
  console.log(`  Result: ${row.result}`);
  console.log(`  Runtime: ${row.runtime}`);
  console.log(`  Session: ${row.session || '(not recorded)'}`);
  console.log(`  Notes: ${row.notes || '(none)'}`);
  console.log(`  Actions: ${row.actions || '(none)'}`);

  // Build analysis prompt for TerminAI
  const analysisPrompt = `Analyze a failed ATS (Agent Test Suite) task. I need you to do root cause analysis.

**ATS-${id}: ${task.title}**

**Original Task Prompt:** "${task.prompt}"

**Evidence for PASS:**
${task.evidence}

**Failure Conditions:**
${task.failure}

**Test Result:**
- Result: ${row.result}
- Runtime: ${row.runtime}
- Session ID: ${row.session || 'unknown'}
- Human Notes: ${row.notes || 'none'}

${row.session ? `Please access session logs for session ${row.session} if available.` : ''}

**Your Mission:**
1. Identify the root cause of the failure.
2. IMPLEMENT the fix by editing the code (files).
3. COMMIT the fix using exactly this format (skip verification hooks):
   
   \`git commit -am "ATS fix - ${id} - session: ${row.session || 'unknown'}" -m "<YOUR_ANALYSIS_SUMMARY>" --no-verify\`

   (Replace <YOUR_ANALYSIS_SUMMARY> with a concise summary of the root cause and fix)

4. Terminate the session.

Output your plan, then execute.`;

  console.log(
    `\n${colors.yellow}Launching TerminAI for root cause analysis...${colors.reset}\n`,
  );

  // Spawn TerminAI with analysis prompt
  const child = spawn('npm', ['start', '--', '-i', analysisPrompt], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '3' },
  });

  await new Promise<void>((resolve) => {
    child.on('exit', () => resolve());
    child.on('error', (err) => {
      console.error('Failed to start process:', err);
      resolve();
    });
  });

  // After analysis, optionally update the scoreboard's Actions column
  const updateActions = await askQuestion(
    `${colors.yellow}Update 'Actions' column with fixes? (paste or Enter to skip): ${colors.reset}`,
  );

  if (updateActions) {
    const content = fs.readFileSync(SCOREBOARD_PATH, 'utf-8');
    const lines = content.split('\n');
    const newLines = lines.map((line) => {
      const match = line.match(/^\|\s*(\d+)\s*\|/);
      if (match && match[1] === id) {
        const parts = line.split('|').map((p) => p.trim());
        const title = parts[2];
        const runtime = parts[3];
        const session = parts[4];
        const result = parts[5];
        const notes = parts[6];
        const actions = updateActions.replace(/\|/g, '-');
        return `| ${id.padEnd(3)} | ${title.padEnd(50)} | ${runtime.padEnd(7)} | ${session.padEnd(36)} | ${result.padEnd(6)} | ${notes.padEnd(20)} | ${actions.padEnd(20)} |`;
      }
      return line;
    });
    fs.writeFileSync(SCOREBOARD_PATH, newLines.join('\n'));
    console.log(`${colors.green}Actions column updated!${colors.reset}`);
  }
}

function printHelp() {
  console.log(`${colors.bright}ATS-50 Agentic Harness${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npm run harness:ats -- <ID>           Run a specific task (e.g. 01)
  npm run harness:ats -- all            Run all tasks in sequence
  npm run harness:ats -- --analyze <ID> Analyze a failed task (root cause)
  npm run harness:ats -- --help         Show this help

${colors.cyan}Examples:${colors.reset}
  npm run harness:ats -- 01             Test task 01
  npm run harness:ats -- --analyze 02   Investigate why task 02 failed
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--analyze')) {
    const analyzeIndex = args.indexOf('--analyze');
    const taskId = args[analyzeIndex + 1];
    if (!taskId) {
      console.error(
        `${colors.red}Error: --analyze requires a task ID${colors.reset}`,
      );
      return;
    }
    await analyzeTask(taskId);
    return;
  }

  let targetTask = args[0];

  if (!targetTask) {
    console.log(`${colors.bright}ATS-50 Agentic Harness${colors.reset}`);
    const answer = await askQuestion(
      'Enter Task ID to run (e.g. 01), "all", or "analyze <ID>": ',
    );
    if (answer.startsWith('analyze ')) {
      const id = answer.replace('analyze ', '').trim();
      await analyzeTask(id);
      return;
    }
    targetTask = answer;
  }

  if (targetTask === 'all') {
    for (const task of atsTasks) {
      await runTask(task.id);
      const cont = await askQuestion('Continue to next task? (Y/n) ');
      if (cont.toLowerCase() === 'n') break;
    }
  } else {
    const id = targetTask.padStart(2, '0');
    await runTask(id);
  }
}

main().catch((err) => console.error(err));
