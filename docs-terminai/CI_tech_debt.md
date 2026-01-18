# CI/CD Technical Debt Register

> [!CAUTION] **Inherited Technical Debt**: This document captures CI/CD
> technical debt inherited from the upstream Gemini CLI's release and testing
> infrastructure. These issues will be systematically cleaned up and resolved by
> **v1.0** (Release for General Adoption).

---

## Table of Contents

1. [Windows CI Flakiness](#windows-ci-flakiness-root-cause--sota-fix-architecture)
2. [Release Workflow Issues](#release-workflow-issues)
3. [NPM Authentication Architecture](#npm-authentication-architecture)
4. [Bypass Flags Currently in Use](#bypass-flags-currently-in-use)

---

## Windows CI Flakiness: Root Cause & SOTA Fix Architecture

### Root Cause Analysis

The persistent "whack-a-mole" test failures on Windows (e.g., in `ThemeManager`,
`Gemini`, `PolicyEngine`) stem from a fundamental **OS Identity Mismatch** in
the test environment.

1. **Identity Crisis**: The tests utilize
   `vi.mock('node:os', () => ({ platform: () => 'linux' }))` to force the code
   into a "Linux" logical path.
2. **Reality Conflict**: The tests run on a physical Windows runner. While the
   _logic_ thinks it's on Linux, the _filesystem_ (via `node:fs` and
   `node:path`) behaves like Windows (backslashes `\`, drive letters `C:\`).
3. **The Crash**: Security and validation logic often checks if a path is "safe"
   or "canonical" (e.g., `!path.startsWith(homeDir)`).
   - Mocked Linux Home: `/home/user`
   - Actual Windows Path: `C:\Users\ContainerAdministrator\...`
   - Result: Determining if `C:\Users\...` is inside `/home/user` is
     mathematically impossible or always false, causing tests to fail
     unexpectedly.

### The "SOTA" Long-Term Fix Architecture

Instead of patching individual tests or hacking regexes, the solution is
**Platform-Agnostic Abstraction**.

#### 1. Abstract the Filesystem in Tests

Never use string literals for paths in tests (e.g., `'/home/user/theme.json'`).

- **Bad**: `const path = '/home/user/file';`
- **Good**: `const path = path.join(os.tmpdir(), 'file');`

#### 2. Context-Aware Mocking

If a test _must_ simulate Linux on Windows, it must also mock `path` and `fs` to
behave like Linux.

- **Strategy**: Use `memfs` or `volcano-fs` to create a virtual, consistent
  filesystem in memory that matches the mocked OS platform.
- **Benefit**: The test runs in a perfect, contained "Matrix" simulation where
  Linux logic meets Linux paths, regardless of the host OS.

#### 3. Vitest Alias Configuration

To fix build artifact issues (pre-commit failures):

- **Action**: Configure `vitest.config.ts` to alias `@terminai/*` packages to
  their `src/index.ts` entry points.
- **Result**: Tests run against live source code, not stale or missing `dist/`
  artifacts.

```typescript
// vitest.config.ts
alias: {
  '@terminai/core': path.resolve(__dirname, '../core/src/index.ts'),
  // ... other packages
}
```

### Current Bypass

Windows tests are currently bypassed in CI via conditional job execution. This
is tracked for v1.0 resolution.

---

## Release Workflow Issues

### Issue 1: Git Push Conflicts on Release Retries

**Problem**: When a release fails mid-way and is retried with the same version
tag, the `git push` command fails with a non-fast-forward error because the
release branch already exists on the remote.

**Root Cause**: The `publish-release` action creates a branch
`release/v<VERSION>` and pushes it. On retry, this branch already exists.

**Current Fix** (in `.github/actions/publish-release/action.yml`):

```yaml
git push --force --set-upstream origin "${BRANCH_NAME}" --follow-tags
```

**Long-Term Fix**: Implement proper idempotent release logic that checks for
existing branches/tags before creating them, or cleans them up on failure.

---

### Issue 2: NPM Token Not Propagated to Tag Step

**Problem**: The `npm dist-tag add` command failed with `401 Unauthorized`
during releases, even though `npm publish` appeared to work.

**Root Cause**: In `.github/actions/publish-release/action.yml`, the
`tag-npm-release` composite action was invoked WITHOUT the `npm-token` input:

```yaml
# BROKEN - npm-token was missing!
- name: '🏷️ Tag release'
  uses: './.github/actions/tag-npm-release'
  with:
    channel: '${{ inputs.npm-tag }}'
    version: '${{ inputs.release-version }}'
    # ... other inputs
    wombat-token-core: 'na' # WRONG - these are invalid inputs
    wombat-token-cli: 'na'
    wombat-token-a2a-server: 'na'
    # npm-token: MISSING!
```

**Fix Applied**:

```yaml
- name: '🏷️ Tag release'
  uses: './.github/actions/tag-npm-release'
  with:
    channel: '${{ inputs.npm-tag }}'
    version: '${{ inputs.release-version }}'
    dry-run: '${{ inputs.dry-run }}'
    github-token: '${{ inputs.github-token }}'
    npm-token: '${{ inputs.npm-token }}' # ADDED
    cli-package-name: '${{ inputs.cli-package-name }}'
    core-package-name: '${{ inputs.core-package-name }}'
    a2a-package-name: '${{ inputs.a2a-package-name }}'
    working-directory: '${{ inputs.working-directory }}'
```

**Long-Term Fix**: Audit all composite actions to ensure secrets are properly
threaded through the entire action chain.

---

### Issue 3: Missing Repository Variables

**Problem**: The release workflow `release-manual.yml` referenced repository
variables (`vars.CLI_PACKAGE_NAME`, etc.) that did not exist.

**Root Cause**: Upstream Gemini CLI likely had these defined in their GitHub
repository settings. Our fork did not inherit them.

**Current Fix**: Hardcoded package names directly in `release-manual.yml`:

```yaml
cli-package-name: '@terminai/cli'
core-package-name: '@terminai/core'
a2a-package-name: '@terminai/a2a-server'
```

**Long-Term Fix**: Define proper repository variables in GitHub Settings →
Secrets and Variables → Variables, then revert to using `${{ vars.* }}`.

---

### Issue 4: NPM Registry URL Misconfiguration

**Problem**: `npm publish` was attempting to publish to GitHub Package Registry
or an incorrect URL.

**Root Cause**: `actions/setup-node` was not configured with the explicit
registry URL, defaulting to GPR based on `@terminai` scope.

**Current Fix**: Hardcoded registry URL in `release-manual.yml`:

```yaml
npm-registry-publish-url: 'https://registry.npmjs.org'
npm-registry-url: 'https://registry.npmjs.org'
npm-registry-scope: '@terminai'
```

**Long-Term Fix**: Centralize registry configuration in a single source of truth
(e.g., `.npmrc` or a shared workflow config).

---

## NPM Authentication Architecture

### Current State

The release workflow uses `secrets.NPM_TOKEN` for authentication. This token
must be:

1. A valid npm automation token with publish permissions
2. Stored as a **repository secret** named `NPM_TOKEN`
3. Accessible to the workflow (not gated by environment restrictions)

### Discovered Issue: Environment Gating

The `release-manual.yml` workflow originally had:

```yaml
environment: "${{ github.event.inputs.environment || 'prod' }}"
```

This caused `secrets.NPM_TOKEN` to be empty because the secret was defined at
the repository level, not within a GitHub Environment.

**Fix**: Removed the `environment` key from the job definition, allowing direct
access to repository secrets.

### Upstream Wombat Tokens

The upstream Gemini CLI used Google's internal "Wombat Dressing Room" for npm
publishing (tokens like `wombat-token-core`). These are **not applicable** to
our public npm publishing flow and have been removed from the action inputs.

---

## Bypass Flags Currently in Use

| Flag               | Location                     | Purpose                                 | v1.0 Target                           |
| ------------------ | ---------------------------- | --------------------------------------- | ------------------------------------- |
| `force_skip_tests` | `release-manual.yml`         | Skip test step for faster releases      | Remove; all releases should run tests |
| `--no-verify`      | `publish-release/action.yml` | Skip pre-commit hooks on release commit | Evaluate if hooks are CI-safe         |
| `--force`          | `publish-release/action.yml` | Force push release branch on retries    | Implement proper idempotent logic     |
| Windows job skip   | `ci.yml` (conditional)       | Skip Windows tests due to flakiness     | Fix with platform-agnostic mocking    |

---

## Action Items for v1.0

- [ ] Implement virtual filesystem testing with `memfs` for Windows parity
- [ ] Audit and document all composite action input/output contracts
- [ ] Create repository variables for package names and registry URLs
- [ ] Remove all bypass flags and ensure green CI on all platforms
- [ ] Add release workflow integration tests (dry-run mode)
- [ ] Document the complete release process in `docs-terminai/releasing.md`

---

## P2: Branding Issues (User-Facing)

These are inherited upstream references that point users to the wrong places.

| Issue               | File                                             | Current Value                             | Should Be                         |
| ------------------- | ------------------------------------------------ | ----------------------------------------- | --------------------------------- |
| Bug report URL      | `packages/cli/src/ui/commands/bugCommand.ts`     | `github.com/google-gemini/gemini-cli`     | `github.com/Prof-Harita/terminaI` |
| Settings docs link  | `packages/cli/src/config/settings-validation.ts` | `github.com/google-gemini/gemini-cli/...` | `terminai.org/docs/configuration` |
| Settings docs link  | `packages/core/src/config/settings/validate.ts`  | `github.com/google-gemini/gemini-cli/...` | `terminai.org/docs/configuration` |
| Error contact email | `packages/cli/src/utils/sandbox.ts`              | `gemini-cli-dev@google.com`               | Remove or use terminai contact    |

**Fix Effort**: ~15 minutes (find/replace)

---

## P3: Internal/Cosmetic Issues

These do not affect end users directly but should be cleaned up.

| Issue                                          | File                                         | Impact                                                                                |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `sandboxImageUri` points to Google registry    | `packages/cli/package.json` (config)         | Sandbox feature relies on Google's container. Evaluate if we host our own or disable. |
| Git committer is `gemini-cli-robot@google.com` | `.github/actions/publish-release/action.yml` | Release commits show wrong author in git history                                      |

**Fix Effort**: ~10 minutes (but sandboxUri needs strategic decision)

---

## P0: file: Reference Resolution (FIXED in v0.50.3+)

**Problem**: `file:../` references in `package.json` dependencies were being
published to npm, causing `Cannot find package` errors for end users.

**Root Cause**: The release workflow only ran `npm install --save-exact` for
`@terminai/core`, but not for `@terminai/a2a-server`.

**Fix Applied**: Added step to install and resolve a2a-server before publishing,
plus a generalized script to resolve all `file:` references.

See:
[M&M Analysis Document](file:///home/profharita/.gemini/antigravity/brain/f106212a-daf9-4867-956e-5d214123368b/mm_analysis_cli_dependency.md)
