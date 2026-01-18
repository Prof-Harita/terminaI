#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import {
  mkdirSync,
  rmSync,
  readFileSync,
  existsSync,
  lstatSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';

const ACTIONLINT_VERSION = '1.7.7';
const SHELLCHECK_VERSION = '0.11.0';
const YAMLLINT_VERSION = '1.35.1';

const TEMP_DIR = join(tmpdir(), 'gemini-cli-linters');

const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed-only');

function getPlatformArch() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === 'linux' && arch === 'x64') {
    return {
      actionlint: 'linux_amd64',
      shellcheck: 'linux.x86_64',
    };
  }
  if (platform === 'darwin' && arch === 'x64') {
    return {
      actionlint: 'darwin_amd64',
      shellcheck: 'darwin.x86_64',
    };
  }
  if (platform === 'darwin' && arch === 'arm64') {
    return {
      actionlint: 'darwin_arm64',
      shellcheck: 'darwin.aarch64',
    };
  }
  if (platform === 'win32') {
    return {
      actionlint: 'unsupported',
      shellcheck: 'unsupported',
    };
  }
  throw new Error(`Unsupported platform/architecture: ${platform}/${arch}`);
}

const platformArch = getPlatformArch();

const PYTHON_VENV_PATH = join(TEMP_DIR, 'python_venv');
const VENV_BIN_DIR = join(
  PYTHON_VENV_PATH,
  process.platform === 'win32' ? 'Scripts' : 'bin',
);

const pythonVenvPythonPath = join(
  PYTHON_VENV_PATH,
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python',
);

const yamllintCheck =
  process.platform === 'win32'
    ? `if exist "${PYTHON_VENV_PATH}\\Scripts\\yamllint.exe" (exit 0) else (exit 1)`
    : `test -x "${PYTHON_VENV_PATH}/bin/yamllint"`;

/**
 * @typedef {{
 *   check: string;
 *   installer: string;
 *   run: string;
 * }}
 */

/**
 * @type {{[linterName: string]: Linter}}
 */
const LINTERS = {
  actionlint: {
    check: 'command -v actionlint',
    installer: `
      mkdir -p "${TEMP_DIR}/actionlint"
      curl -sSLo "${TEMP_DIR}/.actionlint.tgz" "https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/actionlint_${ACTIONLINT_VERSION}_${platformArch.actionlint}.tar.gz"
      tar -xzf "${TEMP_DIR}/.actionlint.tgz" -C "${TEMP_DIR}/actionlint"
    `,
    run: `
      actionlint \
        -color \
        -ignore 'SC2002:' \
        -ignore 'SC2016:' \
        -ignore 'SC2129:' \
        -ignore 'label ".+" is unknown'
    `,
  },
  shellcheck: {
    check: 'command -v shellcheck',
    installer: `
      mkdir -p "${TEMP_DIR}/shellcheck"
      curl -sSLo "${TEMP_DIR}/.shellcheck.txz" "https://github.com/koalaman/shellcheck/releases/download/v${SHELLCHECK_VERSION}/shellcheck-v${SHELLCHECK_VERSION}.${platformArch.shellcheck}.tar.xz"
      tar -xf "${TEMP_DIR}/.shellcheck.txz" -C "${TEMP_DIR}/shellcheck" --strip-components=1
    `,
    run: `
      git ls-files | grep -E '^([^.]+|.*\\.(sh|zsh|bash))' | xargs file --mime-type \
        | grep "text/x-shellscript" | awk '{ print substr($1, 1, length($1)-1) }' \
        | xargs shellcheck \
          --check-sourced \
          --enable=all \
          --exclude=SC2002,SC2129,SC2310 \
          --severity=style \
          --format=gcc \
          --color=never | sed -e 's/note:/warning:/g' -e 's/style:/warning:/g'
    `,
  },
  yamllint: {
    check: yamllintCheck,
    installer: null, // Custom installer function below
    run: "git ls-files | grep -E '\\.(yaml|yml)' | xargs yamllint --format github",
  },
};

// Cross-platform yamllint installer
function installYamllint() {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  try {
    // Create venv
    console.log('Creating Python virtual environment...');
    execSync(`${pythonCmd} -m venv "${PYTHON_VENV_PATH}"`, {
      stdio: 'inherit',
    });

    // Upgrade pip
    console.log('Upgrading pip...');
    execSync(`"${pythonVenvPythonPath}" -m pip install --upgrade pip`, {
      stdio: 'inherit',
    });

    // Install yamllint
    console.log('Installing yamllint...');
    execSync(
      `"${pythonVenvPythonPath}" -m pip install "yamllint==${YAMLLINT_VERSION}" --index-url https://pypi.org/simple`,
      { stdio: 'inherit' },
    );

    return true;
  } catch (e) {
    console.error('Failed to install yamllint:', e.message);
    return false;
  }
}

function runCommand(command, stdio = 'inherit') {
  try {
    const env = { ...process.env };
    const pathKey = Object.keys(env).find((k) => k.match(/^path$/i)) || 'PATH';
    const nodeBin = join(process.cwd(), 'node_modules', '.bin');
    env[pathKey] =
      `${nodeBin}${delimiter}${TEMP_DIR}/actionlint${delimiter}${TEMP_DIR}/shellcheck${delimiter}${VENV_BIN_DIR}${delimiter}${env[pathKey]}`;
    // Force UTF-8 encoding for Python tools on Windows
    if (process.platform === 'win32') {
      env.PYTHONUTF8 = '1';
    }
    execSync(command, { stdio, env });
    return true;
  } catch (_e) {
    return false;
  }
}

// Caching changed files to avoid repeated git calls
let _cachedChangedFiles = null;

function getChangedFiles() {
  if (_cachedChangedFiles) return _cachedChangedFiles;

  const baseRef = process.env.GITHUB_BASE_REF || 'main'; // Default to checking against main
  try {
    // Check if we have origin/main, if not fetch it
    try {
      execSync(`git rev-parse --verify origin/${baseRef}`, { stdio: 'ignore' });
    } catch {
      // If shallow clone or missing ref, try to fetch
      execSync(`git fetch origin ${baseRef}`, { stdio: 'ignore' });
    }

    // If we are on main, compare against HEAD~1, otherwise compare against origin/main
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD')
      .toString()
      .trim();
    const compareTarget =
      currentBranch === baseRef ? 'HEAD~1' : `origin/${baseRef}`;

    // Get the merge base to properly handle divergent branches
    const mergeBase = execSync(`git merge-base HEAD ${compareTarget}`)
      .toString()
      .trim();

    _cachedChangedFiles = execSync(`git diff --name-only ${mergeBase}..HEAD`)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch (_error) {
    console.error(
      `Could not determine changed files. Falling back to all files.`,
    );
    return null; // Null indicates "all files" fallback
  }
  return _cachedChangedFiles;
}

export function setupLinters() {
  console.log('Setting up linters...');
  rmSync(TEMP_DIR, { recursive: true, force: true });
  mkdirSync(TEMP_DIR, { recursive: true });

  for (const linter in LINTERS) {
    if (platformArch[linter] === 'unsupported') {
      console.log(`Skipping ${linter} (unsupported on this platform)...`);
      continue;
    }
    const { check, installer } = LINTERS[linter];
    if (!runCommand(check, 'ignore')) {
      console.log(`Installing ${linter}...`);
      // Use custom installer for yamllint (cross-platform)
      if (linter === 'yamllint') {
        if (!installYamllint()) {
          console.error(
            `Failed to install ${linter}. Please install it manually.`,
          );
          process.exit(1);
        }
      } else if (!runCommand(installer)) {
        console.error(
          `Failed to install ${linter}. Please install it manually.`,
        );
        process.exit(1);
      }
    }
  }
  console.log('All required linters are available.');
}

export function runESLint() {
  console.log('\nRunning ESLint...');
  let command = 'npm run lint';

  if (CHANGED_ONLY) {
    const files = getChangedFiles();
    if (files) {
      const lintableFiles = files.filter(
        (f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f) && existsSync(f),
      );
      if (lintableFiles.length === 0) {
        console.log('No changed JS/TS files to lint.');
        return;
      }
      // Use npx eslint directly to support arguments
      command = `npx eslint ${lintableFiles.map((f) => `"${f}"`).join(' ')}`;
    }
  }

  if (!runCommand(command)) {
    process.exit(1);
  }
}

export function runActionlint() {
  if (platformArch.actionlint === 'unsupported') {
    console.log('\nSkipping actionlint (unsupported on this platform)...');
    return;
  }
  console.log('\nRunning actionlint...');
  // Actionlint is typically fast enough to run on all, but we can optimize if needed.
  // For now, keep as is or implement complex filtering if requested.
  // Actionlint doesn't accept file args easily in the same way, usually runs on .github
  if (!runCommand(LINTERS.actionlint.run)) {
    process.exit(1);
  }
}

export function runShellcheck() {
  if (platformArch.shellcheck === 'unsupported') {
    console.log('\nSkipping shellcheck (unsupported on this platform)...');
    return;
  }
  console.log('\nRunning shellcheck...');
  // Shellcheck run command in LINTERS uses git ls-files.
  // We can override it if CHANGED_ONLY is true.
  if (CHANGED_ONLY) {
    const files = getChangedFiles();
    if (files) {
      const shellFiles = files.filter(
        (f) => /\.(sh|bash|zsh)$/.test(f) && existsSync(f),
      );
      if (shellFiles.length === 0) {
        console.log('No changed shell scripts to lint.');
        return;
      }
      // Construct shellcheck command for specific files
      const cmd = `shellcheck --check-sourced --enable=all --exclude=SC2002,SC2129,SC2310 --severity=style --format=gcc --color=never ${shellFiles.join(' ')} | sed -e 's/note:/warning:/g' -e 's/style:/warning:/g'`;
      if (!runCommand(cmd)) {
        process.exit(1);
      }
      return;
    }
  }

  if (!runCommand(LINTERS.shellcheck.run)) {
    process.exit(1);
  }
}

export function runYamllint() {
  console.log('\nRunning yamllint...');
  let filesToLint = [];

  if (CHANGED_ONLY) {
    const files = getChangedFiles();
    if (files) {
      filesToLint = files.filter(
        (f) => /\.(yaml|yml)$/.test(f) && existsSync(f),
      );
      if (filesToLint.length === 0) {
        console.log('No changed YAML files to lint.');
        return;
      }
    }
  } else {
    try {
      const output = execSync('git ls-files', {
        maxBuffer: 10 * 1024 * 1024,
      })
        .toString()
        .trim();
      const files = output.split('\n').filter(Boolean);
      filesToLint = files.filter((f) => /\.(yaml|yml)$/.test(f));
    } catch (e) {
      console.error('Error finding files:', e);
      // If git command fails, we can't proceed reliably in this strict mode
      process.exit(1);
    }
  }

  if (filesToLint.length === 0) {
    console.log('No YAML files found to lint.');
    return;
  }

  // Chunking to avoid command line length limits on Windows
  const CHUNK_SIZE = 50;
  let hasError = false;

  const yamllintExecutable =
    process.platform === 'win32'
      ? join(VENV_BIN_DIR, 'yamllint.exe')
      : 'yamllint';

  console.log(`Yamllint executable path: ${yamllintExecutable}`);
  if (process.platform === 'win32' && !existsSync(yamllintExecutable)) {
    console.error(`Yamllint executable not found at: ${yamllintExecutable}`);
  }

  for (let i = 0; i < filesToLint.length; i += CHUNK_SIZE) {
    const chunk = filesToLint.slice(i, i + CHUNK_SIZE);
    // Quote files to handle spaces
    const command = `"${yamllintExecutable}" --format github ${chunk.map((f) => `"${f}"`).join(' ')}`;
    if (!runCommand(command)) {
      hasError = true;
    }
  }

  if (hasError) {
    process.exit(1);
  }
}

export function runPrettier() {
  console.log('\nRunning Prettier...');
  let command = 'prettier --check .';

  if (CHANGED_ONLY) {
    const files = getChangedFiles();
    if (files) {
      // Filter for files Prettier usually handles (simplified list)
      const prettierFiles = files.filter(
        (f) =>
          /\.(ts|tsx|js|jsx|json|md|yaml|yml|css|html)$/.test(f) &&
          existsSync(f),
      );
      if (prettierFiles.length === 0) {
        console.log('No changed files for Prettier to check.');
        return;
      }
      command = `prettier --check ${prettierFiles.map((f) => `"${f}"`).join(' ')}`;
    }
  }

  if (!runCommand(command)) {
    process.exit(1);
  }
}

export function runSensitiveKeywordLinter() {
  console.log('\nRunning sensitive keyword linter...');
  const SENSITIVE_PATTERN = /gemini-\d+(\.\d+)?/g;
  const ALLOWED_KEYWORDS = new Set([
    'gemini-2.0-flash-exp.0',
    'gemini-2.5',
    'gemini-2.0',
    'gemini-1.5',
    'gemini-1.0',
  ]);

  const changedFiles = getChangedFiles() || [];
  let violationsFound = false;

  for (const file of changedFiles) {
    if (!existsSync(file) || lstatSync(file).isDirectory()) {
      continue;
    }
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    let match;
    while ((match = SENSITIVE_PATTERN.exec(content)) !== null) {
      const keyword = match[0];
      if (!ALLOWED_KEYWORDS.has(keyword)) {
        violationsFound = true;
        const matchIndex = match.index;
        let lineNum = 0;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (charCount + line.length + 1 > matchIndex) {
            lineNum = i + 1;
            const colNum = matchIndex - charCount + 1;
            console.log(
              `::warning file=${file},line=${lineNum},col=${colNum}::Found sensitive keyword "${keyword}". Please make sure this change is appropriate to submit.`,
            );
            break;
          }
          charCount += line.length + 1; // +1 for the newline
        }
      }
    }
  }

  if (!violationsFound) {
    console.log('No sensitive keyword violations found.');
  }
}

function stripJSONComments(json) {
  return json.replace(
    /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
    (m, g) => (g ? '' : m),
  );
}

export function runTSConfigLinter() {
  // TSConfig linter checks configuration files, which are rare.
  // We can just run it always, it's fast.
  console.log('\nRunning tsconfig linter...');

  let files = [];
  try {
    // Find all tsconfig.json files under packages/ using a git pathspec
    files = execSync("git ls-files 'packages/**/tsconfig.json'")
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch (e) {
    console.error('Error finding tsconfig.json files:', e.message);
    process.exit(1);
  }

  let hasError = false;

  for (const file of files) {
    const tsconfigPath = join(process.cwd(), file);
    if (!existsSync(tsconfigPath)) {
      console.error(`Error: ${tsconfigPath} does not exist.`);
      hasError = true;
      continue;
    }

    try {
      const content = readFileSync(tsconfigPath, 'utf-8');
      const config = JSON.parse(stripJSONComments(content));

      // Check if exclude exists and matches exactly
      if (config.exclude) {
        if (!Array.isArray(config.exclude)) {
          console.error(
            `Error: ${file} "exclude" must be an array. Found: ${JSON.stringify(
              config.exclude,
            )}`,
          );
          hasError = true;
        } else {
          const allowedExclude = new Set(['node_modules', 'dist']);
          const invalidExcludes = config.exclude.filter(
            (item) => !allowedExclude.has(item),
          );

          if (invalidExcludes.length > 0) {
            console.error(
              `Error: ${file} "exclude" contains invalid items: ${JSON.stringify(
                invalidExcludes,
              )}. Only "node_modules" and "dist" are allowed.`,
            );
            hasError = true;
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing ${tsconfigPath}: ${error.message}`);
      hasError = true;
    }
  }

  if (hasError) {
    process.exit(1);
  }
}

function main() {
  if (args.includes('--setup')) {
    setupLinters();
  }
  if (args.includes('--eslint')) {
    runESLint();
  }
  if (args.includes('--actionlint')) {
    runActionlint();
  }
  if (args.includes('--shellcheck')) {
    runShellcheck();
  }
  if (args.includes('--yamllint')) {
    runYamllint();
  }
  if (args.includes('--prettier')) {
    runPrettier();
  }
  if (args.includes('--sensitive-keywords')) {
    runSensitiveKeywordLinter();
  }
  if (args.includes('--tsconfig')) {
    runTSConfigLinter();
  }

  // If no specific flag is passed (other than --changed-only --setup), run all
  // Filter args to exclude flags that are not subcommands
  const flags = ['--changed-only'];
  const subcommandArgs = args.filter((arg) => !flags.includes(arg));

  if (subcommandArgs.length === 0) {
    setupLinters();
    runESLint();
    runActionlint();
    runShellcheck();
    runYamllint();
    runPrettier();
    runSensitiveKeywordLinter();
    runTSConfigLinter();
    console.log('\nAll linting checks passed!');
  }
}

main();
