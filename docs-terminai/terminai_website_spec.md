# terminaI.org Website Specification

## 1. Vision & Strategy

**terminaI** is the Universal Translator between human intent and system action.
It is not just a coding assistant; it is a system operator. The website must
convey this "Universal System Operator" positioning to differentiate from
coding-only tools like Cursor or Copilot.

**Founder Mindset:**

- We are the "underdog" open-source alternative to Big Tech (GitHub/Microsoft,
  Google).
- We prioritize **Safety** (Human-in-the-loop), **Privacy** (Local-first), and
  **Flexibility** (Model agnostic).
- We are **System Aware**: We see CPU, RAM, and processes. We are not just text
  generators.

## 2. Design Language

Based on `docs-terminai/terminai_design.md` and `opencode.ai` inspiration.

- **Theme**: Minimalist, Industrial, Precision.
- **Typography**:
  - **Font**: `Geist Mono` (Primary), `JetBrains Mono` (Code).
  - **Headings**: Large, bold, tighter tracking.
  - **Body**: Clean, high legibility.
- **Color Palette**:
  - **Light Mode (Default)**: "Desert Tan" / Warm White base (e.g., `#FDFCF8` or
    `opencode.ai` style off-white).
  - **Dark Mode**: Deep Black (`#050505`) with IBM ThinkPad Red (`#E2231A`)
    accents.
  - **Accent**: The "Blinking Red I" color `#E2231A`.
- **Visuals**:
  - **Blinking Cursor**: The signature red pulse.
  - **Terminal Windows**: Clean, Mac-style or frameless terminal mockups showing
    `terminaI` in action.

## 3. Sitemap & Content Modeling

Mapping `opencode.ai` structure to `terminaI` content.

### 3.1 Home (`/`)

- **Hero Section**:
  - **Headline**: "The Universal Terminal Operator"
  - **Subhead**: "While coding agents focus on code, terminaI manages your
    entire system. Build, deploy, debug, and secure—from your terminal."
  - **CTAs**: `Download Beta` (Links to /download), `GitHub [Stars]` (Links to
    Repo).
  - **Visual**: The `terminai-banner.svg` animation or an interactive terminal
    demo.
  - **Installation**: `curl -fsSL https://terminai.org/install | bash` (or npm
    equivalent).
- **Features Grid** (The "What is OpenCode?" equivalent):
  - **System Aware**: "See what your OS sees. CPU, RAM, Disk, Processes."
  - **Voice First**: "Push-to-talk. Command your machine while walking around
    the room."
  - **Web Remote**: "Control your terminal from your phone. Securely."
  - **Model Agnostic**: "Bring your own LLM. Gemini, Claude, Ollama."
  - **Safety Guardrails**: "Preview every command. Trust tiers for risky
    operations."
- **Social Proof**: Feature the "Fork Lineage" (Google Gemini CLI fork) and
  "Open Source" badges.
- **Privacy**: "Your data stays yours. Local keys, local logs."
- **FAQ**: Derived from `README.md` "Who Is This For?" and common questions.

### 3.2 Documentation (`/docs`)

- Fully featured documentation hub.
- Content sourced from `docs/*` and `docs-terminai/*`.
- Search enabled (Algolia or local).

### 3.3 Enterprise (`/enterprise`)

- **Focus**: deploying `terminaI` broadly in an org.
- **Content**:
  - "Secured by Vertex AI" (Option 3 in Auth).
  - "Audit Logging" (Project history).
  - "Custom Tools" (MCP Servers for internal APIs).
  - **CTA**: "Contact for Support" or "Deploy with Vercel".

### 3.4 Download (`/download`)

- Detailed installation instructions.
- **NPM**: `npm i -g @google/gemini-cli` (or rebranded package).
- **Source**: Git clone instructions.
- **Alias Setup**: `termai-install.sh`.

### 3.5 Brand / Assets (Optional but pro)

- Logo downloads (SVG/PNG).
- Color palette guide.

## 4. Implementation Plan

### Phase 1: Foundation

- **Framework**: Next.js 14+ (App Router).
- **Styling**: Tailwind CSS.
- **UI Library**: Custom components matching `opencode.ai` minimalism (Radix UI
  primitives if needed).
- **Fonts**: `next/font` with Geist Mono.

### Phase 2: Content Migration

- **MDX**: Use `next-mdx-remote` or Contentlayer to ingest existing `docs/`
  markdown files.
- **Structure**: Preserve the sidebar structure `docs/sidebar.json`.

### Phase 3: Interactive Elements

- **Theme Toggle**: Sun/Moon icon toggling "Desert Tan" and "Void Black".
- **Terminal Replay**: A lightweight component to render `.cast` files
  (Asciinema) or simulated typing for demos.

### Phase 4: Deployment

- **Platform**: Vercel.
- **Domain**: `terminai.org` (DNS configuration required).

## 5. End-to-End Prompt (for AI Builder)

```markdown
You are an expert Frontend Engineer and Designer. Build the official website for
"terminaI" (terminai.org).

**Design System:**

- **Inspiration**: opencode.ai (Structure, Layout, Minimalist Vibe).
- **Typography**: Geist Mono (Primary), JetBrains Mono (Code).
- **Colors**:
  - Light Mode: Off-white/Desert Tan background, Black text.
  - Dark Mode: Pure Black background, White text.
  - Brand Accent: IBM ThinkPad Red (#E2231A).
- **Key Element**: The "I" in terminaI must blink red (cursor style) in the
  logo.

**Pages:**

1. **Home**: Hero (Value prop + Install Cmd), Feature Grid (System Aware, Voice,
   Web Remote), Privacy, FAQ.
2. **Docs**: Full MDX documentation site rendering content from `./docs`.
3. **Enterprise**: Focus on Vertex AI and security.
4. **Download**: Installation guide.

**Tech Stack:**

- Next.js 14, Tailwind CSS, Lucide React icons.
- Use `shadcn/ui` for base components but customized to be "Blocky/Terminal"
  style.

**Content Source:**

- Use the `README.md` for copy.
- Use `docs/sidebar.json` for navigation.
```
