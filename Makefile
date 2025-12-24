# Makefile for gemini-cli

.PHONY: help install build build-sandbox build-all test lint format preflight clean start debug release run-npx create-alias

help:
	@echo "Makefile for gemini-cli"
	@echo ""
	@echo "Usage:"
	@echo "  make install          - Install npm dependencies"
	@echo "  make build            - Build the main project"
	@echo "  make build-all        - Build the main project and sandbox"
	@echo "  make test             - Run the test suite"
	@echo "  make lint             - Lint the code"
	@echo "  make format           - Format the code"
	@echo "  make preflight        - Run formatting, linting, and tests"
	@echo "  make clean            - Remove generated files"
	@echo "  make start            - Start the Gemini CLI"
	@echo "  make debug            - Start the Gemini CLI in debug mode"
	@echo ""
	@echo "  make run-npx          - Run the CLI using npx (for testing the published package)"
	@echo "  make create-alias     - Create a 'gemini' alias for your shell"

install:
	npm install

build:
	npm run build


build-all:
	npm run build:all

test:
	npm run test

lint:
	npm run lint

format:
	npm run format

preflight:
	npm run preflight

clean:
	npm run clean

start:
	npm run start

debug:
	npm run debug


run-npx:
	npx https://github.com/google-gemini/gemini-cli

create-alias:
	scripts/create_alias.sh
You are working on terminaI, a fork of gemini-cli located at /home/profharita/Code/terminaI.

## What's Already Done (MVP)
Per tasks.md section "1. Current State":
- terminaI identity and "General Terminal Tasks" workflows in prompts.ts
- Node-derived system snapshot in environmentContext.ts
- Process Manager Tool implemented with full API (start/list/status/read/send/signal/stop)
- Unit tests for process-manager.ts

## Your Task: Build, Test, and Verify

### Step 1: Build
cd /home/profharita/Code/terminaI
npm ci
npm run build

### Step 2: Run Tests
npm run test:ci --workspace @google/gemini-cli-core

### Step 3: Interactive Verification
Start the CLI:
npm run start

Then manually test these flows:
1. "What's eating my CPU?" - should inspect system and summarize
2. "How much disk do I have?" - should run df/du and report
3. "Start `node -e 'setInterval(() => console.log(Date.now()), 1000)'` as `ticker`" - tests Process Manager
4. "Show me the last 10 lines from `ticker`"
5. "Stop `ticker`" - should ask for confirmation
6. "What's the weather in Austin?" - tests web search

### Step 4: Fix Any Issues
If tests fail or verification doesn't work, debug and fix.

### Step 5: Report Results
After verification, summarize:
- Build status
- Test results (pass/fail count)
- Each manual verification result
- Any bugs found and fixed

Read tasks.md for full context. Good luck.