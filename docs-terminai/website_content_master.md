# terminaI.org Website Master Spec & Content

> **Use this document to build the `terminai.org` Next.js application.** It
> contains the Design System, Site Map, and exact copy for every page.

---

## 1. Global Settings

- **Public Repo URL**: `https://github.com/Prof-Harita/termAI`
- **Install Command**: `npm i -g @google/gemini-cli` (Placeholder until renamed)
  or `git clone https://github.com/Prof-Harita/termAI.git`
- **Tagline**: "The Universal Translator between Human Intent and System
  Action."

### Design System "The Vibe"

| Attribute        | Value                                         | CSS Variable            |
| :--------------- | :-------------------------------------------- | :---------------------- |
| **Primary Font** | `Geist Mono` (700 for headings, 400 for body) | `--font-geist-mono`     |
| **Code Font**    | `JetBrains Mono`                              | `--font-code`           |
| **Light Bg**     | `#FDFCF8` (Desert Tan / Warm White)           | `--bg-light`            |
| **Dark Bg**      | `#050505` (Void Black)                        | `--bg-dark`             |
| **Accent Red**   | `#E2231A` (IBM ThinkPad Red)                  | `--color-brand-red`     |
| **Animation**    | "Hard Blink" (1s loop: 500ms ON, 500ms OFF)   | `.animate-cursor-blink` |

---

## 2. Page: Home (`/`)

### 2.1 Hero Section

- **Layout**: Balanced Center.
- **Visual**: A frameless terminal window. Text types out automatically.
- **Animation Script**:
  1.  `> what's eating my disk space?` (Types at 50ms/char)
  2.  `Scanning... Found 3.2GB in /var/log/journal. Cleanup? (Y/n)`
  3.  `> Y`

- **Heading**: `The Universal Terminal Operator`
- **Subhead**: "While coding agents focus on code, terminaI manages your entire
  system. Build, deploy, debug, and secure—from your terminal."
- **Primary CTA**: `Download Beta` (Links to `/download`) — _Style: Solid Black
  Button (Light Mode) / White Button (Dark Mode)_.
- **Secondary CTA**: `GitHub ★ Star` (Links to
  `https://github.com/Prof-Harita/termAI`) — _Style: Outline_.

### 2.2 Feature Grid ("Why terminaI?")

#### Card 1: System Aware

**Icon**: `Cpu` (Lucide) **Title**: "See What Your OS Sees" **Copy**: "Standard
agents are text-in, text-out. terminaI reads CPU, RAM, disk usage, and process
tables in real-time. It doesn't just guess; it investigates."

#### Card 2: Voice Mode

**Icon**: `Mic` (Lucide) **Title**: "Push-to-Talk" **Copy**: "Hit `Space` to
talk. Command your machine while walking around the room. Local Speech-to-Text
ensures your voice never leaves your device."

#### Card 3: Web Remote

**Icon**: `Globe` (Lucide) **Title**: "Control from Anywhere" **Copy**:
"Securely tunnel into your terminal from your phone or iPad. Check long-running
builds from the dinner table without SSH headaches."

#### Card 4: Safety First

**Icon**: `ShieldCheck` (Lucide) **Title**: "Preview Before Execute" **Copy**:
"Never YOLO. terminaI categorizes commands by risk level and requires explicit
confirmation for destructive actions. You stay in control."

### 2.3 "The Moat" (Comparison)

- **Headline**: "Built Different."
- **Table Data**:
  - **terminaI**: System Operator, Open Source, Voice-First, Safe.
  - **Warp**: UI-focused, Proprietary.
  - **Copilot**: Text-focused, Proprietary.

### 2.4 Footer

- **Links**: "Docs", "GitHub", "License (Apache 2.0)", "Forked from Google
  Gemini CLI".
- **Copyright**: "© 2025 terminaI Contributors."

---

## 3. Page: Enterprise (`/enterprise`)

- **Hero Headline**: "Scale Intelligence, Not Risk."
- **Subhead**: "Deploy terminaI with Vertex AI governance, centralized audit
  logs, and private trust boundaries."

### Key Features

1.  **Bring Your Own Model (Vertex)**: "Connect terminaI to your internal Vertex
    AI endpoints. Keep data within your VPC."
2.  **Audit Logs**: "Every command, every suggestion, every confirmation—logged
    to your SIEM."
3.  **Role Based Access**: "Restrict which tools (File System, Web, Process
    Control) are available to which agents."

- **CTA**: "Contact for Pilot" (Mailto: `partners@terminai.org` - placeholder).

---

## 4. Page: Download (`/download`)

- **Layout**: Split screen. Left = Instructions, Right = ASCII Art of
  installation success.

### Installation Methods

**1. NPM (Universal)**

```bash
npm i -g @google/gemini-cli
# Note: Package rename pending
```

**2. From Source (Developers)**

```bash
git clone https://github.com/Prof-Harita/termAI.git
cd termAI
npm ci && npm run build
npm link --workspace packages/termai
```

**3. The "Muscle Memory" Alias** "Already used to typing `gemini`? We got you."

```bash
./scripts/termai-install.sh --alias-gemini
```

---

## 5. Page: Documentation (`/docs`)

- **Architecture**:
  - Sidebar driven by `sidebar.json`.
  - Content rendered from Markdown.
  - **Search**: Cmd+K via Algolia (or simple client-side search).

- **Core Sections to Migrate**:
  - `Introduction` -> `docs/index.md`
  - `Quickstart` -> `docs/quickstart.md`
  - `Voice Mode` -> `docs/voice.md`
  - `Web Remote` -> `docs/web-remote.md`
  - `Configuration` -> `docs/configuration.md`

---

## 6. Implementation Notes for Developer

1.  **Favicon**: Use the blinking red square (SVG).
2.  **Meta Tags**:
    - Title: `terminaI | The Universal System Operator`
    - Description:
      `Open source AI terminal agent with voice control, web remote, and system awareness.`
    - OG Image: Use `docs-terminai/assets/terminai-banner.svg`.
3.  **Performance**: Use `next/font` for Geist Mono to avoid CLS (Cumulative
    Layout Shift).
4.  **Components**:
    - Use `framer-motion` for the blinking cursor.
    - Use `shiki` for code highlighting (Theme: `github-dark` in dark mode,
      `github-light` in light mode).

---

> **End of Spec. Go build.**
