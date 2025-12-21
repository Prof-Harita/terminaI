# terminaI Deployment & Testing Guide

This guide describes how to build, run, and test the terminaI application locally.

## Prerequisites

- **Node.js**: Version 20 or higher is required.
- **npm**: Included with Node.js.

## 1. Build from Source

Before running the application, you must verify the codebase and build the
project.

```bash
# Install dependencies
npm ci

# Build the project
npm run build
```

## 2. Run Locally (Development)

To run the terminaI CLI directly from the source without installing it globally:

```bash
npm run start
```

This is the recommended way to test changes during development.

## 3. Install Globally

You can make the `gemini` command available globally on your system using one of
the following methods.

### Method A: Create a Shell Alias (Recommended)

We provide a script to create a permanent alias in your shell configuration
(`.bashrc` or `.zshrc`) that points to your local source.

```bash
./scripts/create_alias.sh
source ~/.bashrc  # or source ~/.zshrc
```

### Method B: `npm link`

This creates a symlink in your global `node_modules` folder that points to your
local project.

```bash
npm link
```

### Method C: Install from Local Source

This installs the package globally from your local directory. Note that you will
need to reinstall if you make changes.

```bash
npm install -g .
```

## 4. Running Tests

terminaI uses `vitest` for unit and integration testing.

### Run All Tests (CI Mode)

This is the standard command used in our CI pipeline. It runs all tests across
all workspaces.

```bash
npm run test:ci
```

### Run Tests for Core Logic Only

If you are only working on the core logic (where most terminaI features live):

```bash
npm run test:ci --workspace @google/gemini-cli-core
```

## 5. Manual Verification Checklist

After building, verify the following core functionalities:

1.  **System Inspection**:
    - Run: `gemini` (or `npm run start`)
    - Input: "What's eating my CPU?"
    - Expected: A summary of top CPU-consuming processes.

2.  **Disk Check**:
    - Input: "How much disk do I have?"
    - Expected: Available disk space report.

3.  **Process Manager**:
    - Input: "Start a background ticker process."
    - Input: "List running sessions."
    - Expected: Ticker process appears in the list.

4.  **Web Search**:
    - Input: "What's the weather in Austin?"
    - Expected: Weather forecast.
