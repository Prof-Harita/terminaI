---
description: Assisted Release Flow (Preflight -> Version -> Push -> Monitor)
---

// turbo-all

# Assisted Release Workflow

Use this workflow when the user triggers `/release` or requests a new release.
This ensures a safe, monitored, and standardized release process with full
automation.

## 1. Pre-Release Safety Checks

**Objective**: Ensure the codebase is in a releasable state before proceeding.

1. **Status Check**: Verify working directory is clean

   ```bash
   git status
   ```
   - ❌ **If uncommitted changes exist**: STOP and inform user to commit or
     stash changes first
   - ✅ **If clean**: Proceed to next step

2. **Branch Verification**: Ensure we're on `main` and synchronized

   ```bash
   git checkout main && git pull origin main
   ```
   - ❌ **If pull fails or conflicts exist**: STOP and ask user to resolve
     conflicts
   - ✅ **If successful**: Proceed to preflight

3. **Preflight Checks**: Run comprehensive quality gates
   ```bash
   npm run preflight
   ```
   - ❌ **If preflight fails**: STOP, report specific failures, and ask user if
     they want to fix or override
   - ✅ **If all checks pass**: Proceed to version bump

## 2. Version Bump

**Objective**: Increment version according to semantic versioning.

1. **Identify Release Type**: Ask the user once with clear context:

   > "What type of release is this?
   >
   > - **patch** (bug fixes, backward-compatible)
   > - **minor** (new features, backward-compatible)
   > - **major** (breaking changes)"

2. **Execute Version Bump**: Use npm to bump version and create git tag
   ```bash
   npm version <patch|minor|major> -m "chore: release v%s"
   ```
   - This command:
     - Updates `package.json` version
     - Creates a git commit with the version message
     - Creates a git tag (e.g., `v0.24.0`)
   - ❌ **If command fails**: STOP and report error to user
   - ✅ **If successful**: Capture the new version tag for later use

## 3. Push to Remote

**Objective**: Push code and tags to trigger CI/CD workflows.

1. **Push Main Branch**:

   ```bash
   git push origin main
   ```
   - ❌ **If push fails**: STOP and inform user (likely a permission or network
     issue)
   - ✅ **If successful**: Proceed to push tags

2. **Push Tags**:

   ```bash
   git push origin main --tags
   ```
   - ❌ **If push fails**: WARN user but continue (tags can be pushed later)
   - ✅ **If successful**: Proceed to trigger check

3. **Verify Auto-Trigger or Manually Trigger Release**:
   - **Get the new tag name** from step 2.2 (e.g., `v0.24.0`)
   - **Manually trigger the release workflow** to ensure it runs:
     ```bash
     gh workflow run release.yml --ref main -f tag=<NEW_TAG> -f npm_tag=latest
     ```
   - ⚠️ **Note**: This ensures the release starts even if auto-trigger is flaky
   - ❌ **If trigger fails**: STOP and report error (check `gh` CLI
     authentication)
   - ✅ **If successful**: Proceed to monitoring

## 4. Release Monitoring (Critical)

> [!IMPORTANT] **Agent Directive**: You MUST use the `gh` commands below for
> monitoring. DO NOT use the browser tool to check release status.

**Objective**: Actively monitor CI/CD workflows and report status in real-time.

### 4.1 Monitor NPM Release Workflow

1. **Watch the NPM release workflow**:
   ```bash
   gh run watch -i 5 $(gh run list --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId')
   ```
   - This command:
     - Fetches the most recent `release.yml` workflow run
     - Watches it with 5-second refresh intervals
     - Streams logs to the terminal
2. **Outcome Handling**:
   - ✅ **If NPM release succeeds**:
     - Report to user: "✅ NPM package published successfully"
     - Capture the NPM package version and URL
     - Proceed to binary monitoring
   - ❌ **If NPM release fails**:
     - STOP monitoring
     - Report failure details to user
     - Provide the workflow run URL for debugging:
       ```bash
       gh run list --workflow release.yml --limit 1 --json url -q '.[0].url'
       ```
     - Ask user if they want to investigate or retry

### 4.2 Monitor Binary Build Workflow

1. **Watch the binary builder workflow**:

   ```bash
   gh run watch -i 5 $(gh run list --workflow build-release.yml --limit 1 --json databaseId -q '.[0].databaseId')
   ```
   - This command:
     - Fetches the most recent `build-release.yml` workflow run
     - Watches it with 5-second refresh intervals
     - Streams logs to the terminal

2. **Outcome Handling**:
   - ✅ **If binary build succeeds**:
     - Report to user: "✅ Binaries built and attached to release"
     - Proceed to final notification
   - ❌ **If binary build fails**:
     - Report failure details to user
     - Provide the workflow run URL for debugging:
       ```bash
       gh run list --workflow build-release.yml --limit 1 --json url -q '.[0].url'
       ```
     - Continue to final notification (binaries can be rebuilt later)

## 5. Final Release Notification

**Objective**: Provide a comprehensive release summary to the user.

1. **Generate Release Summary**:
   - Fetch the release details:
     ```bash
     gh release view <NEW_TAG> --json name,url,assets
     ```
2. **Report to User** (use structured format):

   ```
   🎉 Release <NEW_TAG> Complete!

   📦 NPM Package:
      - Published to: https://www.npmjs.com/package/<package-name>
      - Version: <version>

   💿 Binaries:
      - Windows (.msi): <asset-url>
      - Linux (.deb): <asset-url>
      - macOS (.AppImage): <asset-url>

   🔗 Release Page: <release-url>

   ✅ All release workflows completed successfully.
   ```

3. **If Any Failures Occurred**, include troubleshooting section:
   ```
   ⚠️ Issues Encountered:
      - <description of what failed>
      - Workflow URL: <url>
      - Suggested action: <what user should do>
   ```

## 6. Error Recovery Guide

**For Agent Reference**: Common failure scenarios and how to handle them.

| Failure Point          | Likely Cause                          | Agent Action                                  |
| ---------------------- | ------------------------------------- | --------------------------------------------- |
| Dirty git status       | User has uncommitted changes          | STOP, ask user to commit or stash             |
| Preflight fails        | Lint, test, or build errors           | STOP, report failures, ask to fix or override |
| Version bump fails     | Package.json locked or invalid        | STOP, check file permissions                  |
| Push fails             | Network or auth issue                 | STOP, verify `git remote -v` and auth         |
| Workflow trigger fails | GitHub CLI not authenticated          | STOP, ask user to run `gh auth login`         |
| NPM release fails      | Token expired or package config issue | STOP, provide workflow URL for debugging      |
| Binary build fails     | Platform-specific build issue         | WARN, continue (binaries can be rebuilt)      |

## 7. Quick Reference

**Full Release Command Sequence** (for agent automation):

```bash
# Safety
git status
git checkout main && git pull origin main
npm run preflight

# Version (ask user first)
npm version <type> -m "chore: release v%s"
export NEW_TAG=$(git describe --tags --abbrev=0)

# Push
git push origin main
git push origin main --tags
gh workflow run release.yml --ref main -f tag=$NEW_TAG -f npm_tag=latest

# Monitor
gh run watch -i 5 $(gh run list --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch -i 5 $(gh run list --workflow build-release.yml --limit 1 --json databaseId -q '.[0].databaseId')

# Report
gh release view $NEW_TAG --json name,url,assets
```

---

**Agent Notes**:

- All commands should be auto-run due to `// turbo-all` annotation
- Always wait for each monitoring step to complete before proceeding
- Provide real-time updates to user during long-running operations
- If any critical step fails, STOP and ask for user guidance
- Use structured notifications to keep user informed throughout
