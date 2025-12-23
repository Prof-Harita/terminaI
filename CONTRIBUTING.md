# Contributing to TerminaI

TerminaI is a community-built “Sovereign Shell”: governed autonomy for laptops
and servers.

We’re optimizing for **contributors** right now. If you want to build the future
of trustworthy system automation (A2A, MCP, policy gating, PTY hardening, audit
logs), you’re in the right place.

## Quick start (dev setup)

**Prereqs:** Node.js `>=20`, Git.

```bash
git clone https://github.com/Prof-Harita/terminaI.git
cd terminaI
npm ci
npm run build

# Link the launcher
npm link --workspace packages/termai

# Run
terminai
```

See also: `docs-terminai/quickstart.md`.

## Where to contribute (pick a lane)

High-impact areas (with suggested entry points):

1. **Governance / Safety** — approvals, trust boundaries, policy ladder
   - start: `packages/core/src/safety/`, `packages/core/src/policy/`
2. **PTY hardening (Desktop System Operator)** — resize, exit status,
   backpressure, signals
   - start: `packages/desktop/src-tauri/src/pty_session.rs`
3. **Auditability** — audit log + user-visible action history
   - start: `docs/security-posture.md`,
     `packages/core/src/telemetry/sanitize.ts`
4. **MCP ecosystem** — new powers via MCP servers
   - start: `docs/tools/mcp-server.md`
5. **A2A protocol + clients** — drive TerminaI from IDE/GUI/scripts
   - start: `packages/a2a-server/`, `docs-terminai/web-remote.md`

## How to contribute (process)

1. Pick an issue (or open one).
2. Fork the repo, create a branch.
3. Make a focused change.
4. Run validators (see below).
5. Open a PR.

### PR hygiene

- Keep PRs small and focused.
- Link to an issue where possible.
- Add/adjust tests when behavior changes.
- Avoid drive-by refactors.

## Validators

Fast local checks:

```bash
npm test --workspaces --if-present
```

If you’re changing linted areas:

```bash
npm run lint
```

Full preflight (slow):

```bash
npm run preflight
```

## Security & secrets

- Do not commit secrets, API keys, or tokens.
- If you find a vulnerability, please follow `SECURITY.md`.

## Code of Conduct

By participating, you agree to `CODE_OF_CONDUCT.md`.

## Licensing

This project is licensed under Apache 2.0. By submitting a pull request, you
agree that your contributions are licensed under the same terms.

### Coding conventions

- Please adhere to the coding style, patterns, and conventions used throughout
  the existing codebase.
- Consult
  [GEMINI.md](https://github.com/google-gemini/gemini-cli/blob/main/GEMINI.md)
  (typically found in the project root) for specific instructions related to
  AI-assisted development, including conventions for React, comments, and Git
  usage.
- **Imports:** Pay special attention to import paths. The project uses ESLint to
  enforce restrictions on relative imports between packages.

### Project structure

- `packages/`: Contains the individual sub-packages of the project.
  - `a2a-server`: A2A server implementation for the Gemini CLI. (Experimental)
  - `cli/`: The command-line interface.
  - `core/`: The core backend logic for the Gemini CLI.
  - `test-utils` Utilities for creating and cleaning temporary file systems for
    testing.
  - `vscode-ide-companion/`: The Gemini CLI Companion extension pairs with
    Gemini CLI.
- `docs/`: Contains all project documentation.
- `scripts/`: Utility scripts for building, testing, and development tasks.

For more detailed architecture, see `docs/architecture.md`.

### Debugging

#### VS Code

0.  Run the CLI to interactively debug in VS Code with `F5`
1.  Start the CLI in debug mode from the root directory:
    ```bash
    npm run debug
    ```
    This command runs `node --inspect-brk dist/gemini.js` within the
    `packages/cli` directory, pausing execution until a debugger attaches. You
    can then open `chrome://inspect` in your Chrome browser to connect to the
    debugger.
2.  In VS Code, use the "Attach" launch configuration (found in
    `.vscode/launch.json`).

Alternatively, you can use the "Launch Program" configuration in VS Code if you
prefer to launch the currently open file directly, but 'F5' is generally
recommended.

To hit a breakpoint inside the sandbox container run:

```bash
DEBUG=1 gemini
```

**Note:** If you have `DEBUG=true` in a project's `.env` file, it won't affect
gemini-cli due to automatic exclusion. Use `.gemini/.env` files for gemini-cli
specific debug settings.

### React DevTools

To debug the CLI's React-based UI, you can use React DevTools. Ink, the library
used for the CLI's interface, is compatible with React DevTools version 4.x.

1.  **Start the Gemini CLI in development mode:**

    ```bash
    DEV=true npm start
    ```

2.  **Install and run React DevTools version 4.28.5 (or the latest compatible
    4.x version):**

    You can either install it globally:

    ```bash
    npm install -g react-devtools@4.28.5
    react-devtools
    ```

    Or run it directly using npx:

    ```bash
    npx react-devtools@4.28.5
    ```

    Your running CLI application should then connect to React DevTools.
    ![](/docs/assets/connected_devtools.png)

### Sandboxing

#### macOS Seatbelt

On macOS, `gemini` uses Seatbelt (`sandbox-exec`) under a `permissive-open`
profile (see `packages/cli/src/utils/sandbox-macos-permissive-open.sb`) that
restricts writes to the project folder but otherwise allows all other operations
and outbound network traffic ("open") by default. You can switch to a
`restrictive-closed` profile (see
`packages/cli/src/utils/sandbox-macos-restrictive-closed.sb`) that declines all
operations and outbound network traffic ("closed") by default by setting
`SEATBELT_PROFILE=restrictive-closed` in your environment or `.env` file.
Available built-in profiles are `{permissive,restrictive}-{open,closed,proxied}`
(see below for proxied networking). You can also switch to a custom profile
`SEATBELT_PROFILE=<profile>` if you also create a file
`.gemini/sandbox-macos-<profile>.sb` under your project settings directory
`.gemini`.

#### Container-based sandboxing (all platforms)

For stronger container-based sandboxing on macOS or other platforms, you can set
`GEMINI_SANDBOX=true|docker|podman|<command>` in your environment or `.env`
file. The specified command (or if `true` then either `docker` or `podman`) must
be installed on the host machine. Once enabled, `npm run build:all` will build a
minimal container ("sandbox") image and `npm start` will launch inside a fresh
instance of that container. The first build can take 20-30s (mostly due to
downloading of the base image) but after that both build and start overhead
should be minimal. Default builds (`npm run build`) will not rebuild the
sandbox.

Container-based sandboxing mounts the project directory (and system temp
directory) with read-write access and is started/stopped/removed automatically
as you start/stop Gemini CLI. Files created within the sandbox should be
automatically mapped to your user/group on host machine. You can easily specify
additional mounts, ports, or environment variables by setting
`SANDBOX_{MOUNTS,PORTS,ENV}` as needed. You can also fully customize the sandbox
for your projects by creating the files `.gemini/sandbox.Dockerfile` and/or
`.gemini/sandbox.bashrc` under your project settings directory (`.gemini`) and
running `gemini` with `BUILD_SANDBOX=1` to trigger building of your custom
sandbox.

#### Proxied networking

All sandboxing methods, including macOS Seatbelt using `*-proxied` profiles,
support restricting outbound network traffic through a custom proxy server that
can be specified as `GEMINI_SANDBOX_PROXY_COMMAND=<command>`, where `<command>`
must start a proxy server that listens on `:::8877` for relevant requests. See
`docs/examples/proxy-script.md` for a minimal proxy that only allows `HTTPS`
connections to `example.com:443` (e.g. `curl https://example.com`) and declines
all other requests. The proxy is started and stopped automatically alongside the
sandbox.

### Manual publish

We publish an artifact for each commit to our internal registry. But if you need
to manually cut a local build, then run the following commands:

```
npm run clean
npm install
npm run auth
npm run prerelease:dev
npm publish --workspaces
```

## Documentation contribution process

Our documentation must be kept up-to-date with our code contributions. We want
our documentation to be clear, concise, and helpful to our users. We value:

- **Clarity:** Use simple and direct language. Avoid jargon where possible.
- **Accuracy:** Ensure all information is correct and up-to-date.
- **Completeness:** Cover all aspects of a feature or topic.
- **Examples:** Provide practical examples to help users understand how to use
  Gemini CLI.

### Getting started

The process for contributing to the documentation is similar to contributing
code.

1. **Fork the repository** and create a new branch.
2. **Make your changes** in the `/docs` directory.
3. **Preview your changes locally** in Markdown rendering.
4. **Lint and format your changes.** Our preflight check includes linting and
   formatting for documentation files.
   ```bash
   npm run preflight
   ```
5. **Open a pull request** with your changes.

### Documentation structure

Our documentation is organized using [sidebar.json](/docs/sidebar.json) as the
table of contents. When adding new documentation:

1. Create your markdown file **in the appropriate directory** under `/docs`.
2. Add an entry to `sidebar.json` in the relevant section.
3. Ensure all internal links use relative paths and point to existing files.

### Style guide

We follow the
[Google Developer Documentation Style Guide](https://developers.google.com/style).
Please refer to it for guidance on writing style, tone, and formatting.

#### Key style points

- Use sentence case for headings.
- Write in second person ("you") when addressing the reader.
- Use present tense.
- Keep paragraphs short and focused.
- Use code blocks with appropriate language tags for syntax highlighting.
- Include practical examples whenever possible.

### Linting and formatting

We use `prettier` to enforce a consistent style across our documentation. The
`npm run preflight` command will check for any linting issues.

You can also run the linter and formatter separately:

- `npm run lint` - Check for linting issues
- `npm run format` - Auto-format markdown files
- `npm run lint:fix` - Auto-fix linting issues where possible

Please make sure your contributions are free of linting errors before submitting
a pull request.

### Before you submit

Before submitting your documentation pull request, please:

1. Run `npm run preflight` to ensure all checks pass.
2. Review your changes for clarity and accuracy.
3. Check that all links work correctly.
4. Ensure any code examples are tested and functional.
5. Sign the
   [Contributor License Agreement (CLA)](https://cla.developers.google.com/) if
   you haven't already.

### Need help?

If you have questions about contributing documentation:

- Check our [FAQ](/docs/faq.md).
- Review existing documentation for examples.
- Open [an issue](https://github.com/google-gemini/gemini-cli/issues) to discuss
  your proposed changes.
- Reach out to the maintainers.

We appreciate your contributions to making Gemini CLI documentation better!
