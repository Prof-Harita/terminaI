# tasks_roadmapv3.md — TerminaI v0.21.0 Launch Execution Plan

## Priority Legend

- **[H]** = Launch Blocker (must complete before public promotion)
- **[M]** = Fast Follow (week 1 post-launch)
- **[L]** = Month 2 polish

---

# SECTION A: MANUAL TASKS (Only You Can Do)

These require credentials, external services, or human judgment that cannot be
delegated to an agent.

---

## [H-MANUAL-1] GitHub Repo Sovereignty

**What:** Ensure the GitHub repo header does NOT say "forked from
google/gemini-cli".

**Actions:**

1. Confirm repo was created fresh (not via GitHub "Fork" button) — you marked
   this DONE in roadmapv1.md.
2. Update repo settings:
   - Description: "The Sovereign Shell: Governed Autonomy for Systems and
     Servers"
   - Website: `https://terminai.org` (or your landing page)
   - Topics: `ai`, `terminal`, `shell`, `sysadmin`, `agent`, `gemini`

**Verification:** Visit `https://github.com/youruser/terminai` — no "forked
from" badge visible.

---

## [H-MANUAL-2] NPM Publishing Credentials

**What:** Set up NPM org and token for `@terminai/*` packages.

**Actions:**

1. Create NPM org: `terminai` at https://www.npmjs.com/org/create
2. Generate publish token: `npm token create --type=publish`
3. Add `NPM_TOKEN` to GitHub repo secrets for CI

**Verification:** `npm whoami --registry https://registry.npmjs.org` shows your
account.

---

## [H-MANUAL-3] CI/CD Workflow Cleanup

**What:** Remove Google-specific workflows; add your own release workflow.

**Actions:**

1. Delete these files (or archive to `.github/workflows-archived/`):
   - `.github/workflows/release-nightly.yml`
   - `.github/workflows/release-docker.yml`
   - Any workflow referencing Google-internal secrets
2. Create `.github/workflows/release-terminai.yml` — agent can draft this, but
   you must review secrets usage.

**Verification:** `gh workflow list` shows only your workflows.

---

## [H-MANUAL-4] Domain & OAuth Relay (Optional for Launch)

**What:** If you want OAuth to say "Connect to termAI" instead of a raw Google
login.

**Actions:**

1. Deploy a simple relay page at `auth.terminai.org` (can be a static HTML page
   on GitHub Pages or Vercel)
2. Update OAuth redirect URI in Google Cloud Console to point to your relay

**Deferrable:** You can launch with the existing Google OAuth flow; users will
still see "Google Sign-In" but it works.

---

# SECTION B: AGENTIC TASKS (Agent Can Execute)

Each task below is fully specced with target files, exact changes, and
verification commands. Execute in order.

---

## [H-AGENT-1] Sovereign Binary & Package Identity

**Goal:** `terminai` is the primary command; packages are `@terminai/*`.

### Target Files:

- `/package.json`
- `/packages/core/package.json`
- `/packages/cli/package.json`
- `/packages/a2a-server/package.json`
- `/packages/termai/package.json`
- `/packages/termai/src/index.ts`

### Changes:

**Root `/package.json`:**

```json
{
  "name": "terminai-monorepo",
  "repository": {
    "url": "https://github.com/YOUR_USER/terminai"
  }
}
```

**`/packages/core/package.json`:**

```json
{ "name": "@terminai/core" }
```

**`/packages/cli/package.json`:**

```json
{
  "name": "@terminai/cli",
  "bin": {
    "terminai": "./dist/index.js",
    "gemini": "./dist/index.js"
  }
}
```

**`/packages/a2a-server/package.json`:**

```json
{ "name": "@terminai/a2a-server" }
```

**`/packages/termai/src/index.ts`:**

- Set `process.env.TERMINAI_BRAND = '1'` before importing CLI
- Set `process.title = 'terminai'`

### Verification:

```bash
npm run build
node packages/cli/dist/index.js --version
# Should show "terminai" branding, not "Gemini CLI"
```

---

## [H-AGENT-2] Storage Path Migration (Non-Breaking)

**Goal:** Use `~/.terminai` for all new data; fall back to `~/.gemini` for
reads.

### Target Files:

- `/packages/core/src/utils/paths.ts`
- `/packages/core/src/services/chatRecordingService.ts`
- `/packages/core/src/tools/memoryTool.ts`

### Changes:

**`paths.ts`:**

```typescript
// Change:
const TERMINAI_DIR = '.terminai';

// Add migration logic in getAppConfigDir():
export function getAppConfigDir(): string {
  const terminaiPath = path.join(os.homedir(), '.terminai');
  const legacyPath = path.join(os.homedir(), '.gemini');

  // First run migration: copy legacy to new (non-destructive)
  if (!fs.existsSync(terminaiPath) && fs.existsSync(legacyPath)) {
    fs.cpSync(legacyPath, terminaiPath, { recursive: true });
  }

  return terminaiPath;
}

// Add fallback read helper:
export function readWithFallback(relativePath: string): string | null {
  const primary = path.join(getAppConfigDir(), relativePath);
  const legacy = path.join(os.homedir(), '.gemini', relativePath);

  if (fs.existsSync(primary)) return fs.readFileSync(primary, 'utf-8');
  if (fs.existsSync(legacy)) return fs.readFileSync(legacy, 'utf-8');
  return null;
}
```

**`memoryTool.ts`:**

- Change references from `GEMINI.md` to `TERMINAI.md` for new files
- Keep fallback read for `GEMINI.md`

### Verification:

```bash
rm -rf ~/.terminai  # Clear test state
npm run build
node packages/cli/dist/index.js --help
ls ~/.terminai  # Should exist with migrated content
ls ~/.gemini    # Should still exist (not deleted)
```

---

## [H-AGENT-3] User Agent & Telemetry Rebrand

**Goal:** Network requests identify as `TerminaI`, not `GeminiCLI`.

### Target Files:

- `/packages/core/src/core/contentGenerator.ts`
- `/packages/core/src/telemetry/constants.ts` (if exists)
- `/packages/core/src/config/constants.ts`

### Changes:

**`contentGenerator.ts`:**

```typescript
// Find userAgent string, change to:
const userAgent = `TerminaI/${version} (${platform})`;
```

**`constants.ts`:**

```typescript
export const APP_NAME = 'terminai';
export const TELEMETRY_PREFIX = 'terminai/';
```

### Verification:

```bash
npm run test -w packages/core
# Grep for "GeminiCLI" in dist/ — should return nothing
```

---

## [H-AGENT-4] License Headers

**Goal:** Assert copyright while staying Apache 2.0 compliant.

### Action:

Run regex find/replace across `/packages/`:

**Find:**

```
Copyright 2024 Google LLC
```

**Replace:**

```
Copyright 2024 Google LLC
// Portions Copyright 2025 TerminaI Authors
```

### Verification:

```bash
grep -r "Copyright 2025 TerminaI" packages/ | head -5
# Should show updated files
```

---

## [H-AGENT-5] System Operator Recipes (3 Launch Recipes)

**Goal:** Ship proof of "governed system operations."

### Target Files (create new):

- `/packages/core/src/policy/recipes/wifi-fix.toml`
- `/packages/core/src/policy/recipes/docker-prune.toml`
- `/packages/core/src/policy/recipes/dns-debug.toml`

### Content:

**`wifi-fix.toml`:**

```toml
[agent]
name = "wifi-fix"
description = "Diagnose and repair WiFi connectivity issues"

[commands]
read = ["nmcli", "ip link", "ping", "iwconfig", "networkctl"]
write = ["nmcli connection up", "systemctl restart NetworkManager"]

[policy]
default = "read-only"
write_requires = "user-confirm"
```

**`docker-prune.toml`:**

```toml
[agent]
name = "docker-prune"
description = "Clean up unused Docker resources"

[commands]
read = ["docker ps", "docker images", "docker system df"]
write = ["docker system prune -f", "docker volume prune -f"]

[policy]
default = "write"
write_requires = "user-confirm"
yolo_warning = "This will remove all stopped containers and unused images"
```

**`dns-debug.toml`:**

```toml
[agent]
name = "dns-debug"
description = "Troubleshoot DNS resolution issues"

[commands]
read = ["dig", "nslookup", "host", "cat /etc/resolv.conf", "resolvectl status"]
write = ["systemctl restart systemd-resolved"]

[policy]
default = "read-only"
```

### Verification:

```bash
ls packages/core/src/policy/recipes/
# Should show 3 .toml files
```

---

## [H-AGENT-6] One-Line Installer Script

**Goal:** `curl -sSL https://install.terminai.org | sh` works.

### Target File (create new):

- `/scripts/terminai-install.sh`

### Content:

```bash
#!/bin/bash
set -e

echo "Installing TerminaI..."

# Detect OS
OS=$(uname -s)
ARCH=$(uname -m)

# Determine install method
if command -v npm &> /dev/null; then
  echo "Installing via npm..."
  npm install -g @terminai/cli
else
  echo "npm not found. Please install Node.js first:"
  echo "  https://nodejs.org/"
  exit 1
fi

# Add to PATH hint
echo ""
echo "✓ TerminaI installed successfully!"
echo ""
echo "Run 'terminai' to start, or add an alias:"
echo "  echo 'alias t=terminai' >> ~/.bashrc"
echo ""
terminai --version
```

### Verification:

```bash
chmod +x scripts/terminai-install.sh
bash scripts/terminai-install.sh
terminai --version
```

---

## [H-AGENT-7] README Rewrite

**Goal:** GitHub landing page sells "Sovereign Shell", not "Gemini fork".

### Target File:

- `/README.md`

### Key Changes:

1. **Hero line:** "The Sovereign Shell: Governed Autonomy for Systems and
   Servers"
2. **Pitch:** "Google provides the intelligence. TerminaI provides the root
   access and the guardrails."
3. **One-line install** front and center
4. **Remove** any "fork of Gemini CLI" language
5. **Add badges:** npm version, license (Apache 2.0), platform support

### Verification:

```bash
head -20 README.md
# Should show new branding, not Google references
```

---

## [H-AGENT-8] Auth Dialog Text Rebrand

**Goal:** First-run experience says "Connect TerminaI to Gemini", not Google
login.

### Target Files:

- `/packages/cli/src/ui/auth/AuthDialog.tsx`
- `/packages/cli/src/ui/auth/ApiAuthDialog.tsx`

### Changes:

- Change dialog title: "Connect TerminaI to a Model Provider"
- Change instructions: "TerminaI uses Gemini for intelligence. Enter your API
  key below."
- Update token storage path to `~/.terminai/auth/`

### Verification:

```bash
npm run build -w packages/cli
# Run app fresh (no stored creds) and check dialog text
```

---

# SECTION C: FAST FOLLOWS [M]

These are post-launch but important for Week 1:

1. **A2A Example Client** — `packages/a2a-server/examples/python_client.py`
2. **Homebrew Formula** — `Formula/terminai.rb`
3. **Windows Installer** — `scripts/install.ps1`
4. **Connection Test Button** in auth flow
5. **Recipe Validation Script** — `scripts/validate-recipes.ts`
6. **Troubleshooting Docs** — `docs-terminai/troubleshooting.md`

---

# SECTION D: DEFERRED [L]

These are Month 2 / post-traction:

1. Provider Abstraction Layer (decouple `@google/genai`)
2. Ollama/Anthropic adapter skeletons
3. PTY Hardening (resize, child handle, backpressure)
4. Black Box Audit Log (SQLite + tamper evidence)
5. Desktop Governance Dashboard
6. Local-first safety classifier
7. SEO / marketing docs

---

# EXECUTION ORDER

1. **You (Manual):** Confirm GitHub repo settings, NPM org
2. **Agent:** H-AGENT-1 through H-AGENT-8 in sequence
3. **You (Manual):** Review + push + npm publish
4. **You (Manual):** Tweet / announce

**Estimated agent execution time:** 2-3 hours for all H-AGENT tasks.
