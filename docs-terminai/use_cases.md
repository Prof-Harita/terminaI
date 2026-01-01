# Comprehensive Use Case Commands

TerminaI provides **49 specialized agentic commands** covering system
operations, data analysis, content creation, and more. Each command is optimized
with a specific prompt and MCP configuration.

## Organization

Commands follow the naming convention: `/{bucket}-{context}-{action}`.

| Bucket    | Category          | Description                                 |
| :-------- | :---------------- | :------------------------------------------ |
| `sys`     | System Operations | File management, cleanup, shell translation |
| `data`    | Data Analysis     | CSV reporting, financial research, SQL      |
| `content` | Content Creation  | Release notes, issues, ghostwriting         |
| `prod`    | Productivity      | Travel, diet, todos, budget                 |
| `sec`     | Security          | Auditing, CVE scanning, pipeline healing    |
| `devops`  | DevOps/SRE        | Incident triage, IaC, home automation       |
| `edu`     | Education         | Tutoring, quizzes, hands-on learning        |
| `work`    | Workflow          | Slack, Drive, BigQuery integration          |
| `access`  | Accessibility     | Voice mode, screen reader audits            |
| `env`     | Environment       | Scaffolding, dotfiles, npm config           |
| `art`     | Art Generation    | ASCII art, procedural visuals               |
| `game`    | Gaming            | Minecraft, Pokemon, text adventures         |
| `sci`     | Science           | Deep research, wet lab automation           |

---

## 💻 System Operations (`sys-`)

- `/sys-semantic-file-search`: Find files by content description.
- `/sys-context-aware-renaming`: Batch rename with context (camelCase, etc.).
- `/sys-intelligent-stale-cleanup`: Clean old node_modules/build artifacts
  safe-ly.
- `/sys-natural-language-shell`: Translate intent to precise shell commands.
- `/sys-smart-asset-organizer`: Organize chaotic folders by content.

## 📊 Data & Reporting (`data-`)

- `/data-auto-csv-report`: Clean data and generate PDF reports from CSVs.
- `/data-financial-market-research`: Investment reports and technical
  indicators.
- `/data-text-to-sql`: Convert natural language to SQL queries.
- `/data-visual-data-entry`: Visually read spreadsheets and input to legacy
  apps.

## 📝 Content Creation (`content-`)

- `/content-auto-release-notes`: Draft release notes from git diffs.
- `/content-intelligent-issue-reporting`: Create issues from test failures.
- `/content-technical-ghost-writing`: Turn branches into blog posts.
- `/content-creative-writing-persona`: Creative writing partner (show, don't
  tell).
- `/content-context-aware-email`: Draft emails based on project context.

## ⚡ Productivity (`prod-`)

- `/prod-agentic-travel-planner`: Plan itineraries with Google Maps/Travel.
- `/prod-diet-meal-planner`: Meal plans and grocery lists.
- `/prod-semantic-todo-manager`: Organize and prioritize todo.txt.
- `/prod-track-budget-expenses`: Monitor expenses against thresholds.

## 🛡️ Security (`sec-`)

- `/sec-automated-security-auditor`: Run validation tests and security checks.
- `/sec-self-healing-pipelines`: Fix CI/CD failures automatically.
- `/sec-audit-dependency-cves`: Scan dependencies for vulnerabilities.
- `/sec-pre-commit-guardian`: Scan staged files for secrets.

## 🏗️ DevOps & SRE (`devops-`)

- `/devops-incident-triage-control`: Triage outages via Dynatrace.
- `/devops-infrastructure-as-code`: Generate Tf/K8s manifests.
- `/devops-home-automation-control`: Control Home Assistant entities.

## 🎓 Education (`edu-`)

- `/edu-interactive-concept-tutor`: Socratic tutoring for complex topics.
- `/edu-hands-on-learning`: Hands-on tutorials (e.g., Prompt Engineering).
- `/edu-doc-quiz-generator`: Generate quizzes from docs.
- `/edu-explain-like-five`: Simplify concepts or errors.

## 🔗 Workflow Integration (`work-`)

- `/work-slack-command-center`: Manage Slack channels and messages.
- `/work-google-drive-manager`: Read/Write Docs and Sheets.
- `/work-bigquery-data-control`: Interact with BigQuery data.
- `/work-multi-tool-pipeline`: Chain multiple tool outputs.

## ♿ Accessibility (`access-`)

- `/access-bidirectional-voice-mode`: Hands-free coding (VoiceMode).
- `/access-voice-smart-display`: Control headless displays via voice.
- `/access-screen-reader-audit`: Audit code for ARIA compliance.

## ⚙️ Environment (`env-`)

- `/env-secure-npm-config`: Automate .npmrc setup.
- `/env-project-scaffolding-setup`: Scaffold projects from descriptions.
- `/env-context-doc-recall`: Recall setup from CLAUDE.md.
- `/env-shell-startup-optimizer`: Optimize shell startup scripts.

## 🎨 Art & Visuals (`art-`)

- `/art-ascii-banner-gen`: Generate ASCII art banners.
- `/art-retro-mac-paint`: Draw images via emulated MacPaint.
- `/art-procedural-visual-code`: Generate fractal/visual code.

## 🎮 Gaming (`game-`)

- `/game-minecraft-auto-play`: Play Minecraft via visual agents.
- `/game-pokemon-red-agent`: Autonomous Pokemon gameplay.
- `/game-text-adventure-master`: DM for text adventures.

## 🔬 Science (`sci-`)

- `/sci-deep-research-synthesis`: Synthesize scientific papers.
- `/sci-wet-lab-automation`: Interface with lab robotics.
- `/sci-medical-image-query`: query DICOM images.
