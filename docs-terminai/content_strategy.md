# Website Content Generation Strategy

To get content for _every single page_ that rivals `opencode.ai`, we will use a
**"Source-to-Page" Pipeline**. We don't reinvent the wheel; we transmute
existing high-quality documentation into marketing copy.

## Sources of Truth

1.  **`README.md`**: The core value prop, features, and "Why Us".
2.  **`test.docx` (Decoded)**: The "Founder's Vision", risks, and strategic
    positioning.
3.  **`docs/*`**: Technical details for the Documentation section.
4.  **`tasksvoice.md` / `web-remote.md`**: Specific feature details.

## Content Mapping (Page by Page)

### 1. Home Page (`/`)

- **Hero**: "The Universal Translator between Human Intent and System Action."
  (Source: `README.md` Line 6).
- **"The Problem"**: "Coding agents write code. They don't run your system."
  (Source: `README.md` Line 14).
- **Feature Grid**:
  - _System Awareness_: "CPU, RAM, Processes." (Source: `termai-system.md`).
  - _Voice_: "Push-to-Talk." (Source: `docs-terminai/voice.md`).
  - _Web Remote_: "Control from anywhere." (Source:
    `docs-terminai/web-remote.md`).
- **Social Proof**: Fork lineage stats (Source: `README.md` Line 239).

### 2. Enterprise (`/enterprise`)

- **Headline**: "Secure, Private, and Governed AI Operations."
- **Security**: "Preview Mode, Trust Boundaries." (Source: `README.md` Line
  180 + `docs/safety-architecture.md`).
- **Governance**: "Audit logs for every action." (Source: `test.docx` "Risks &
  Threats").
- **Deployment**: "Vertex AI Integration." (Source: `README.md` Line 94 +
  `docs/get-started/authentication.md`).

### 3. Docs (`/docs`)

- **Strategy**: Direct Markdown Import.
- **Content**:
  - `docs-terminai/index.md` -> `/docs/introduction`
  - `docs-terminai/quickstart.md` -> `/docs/quickstart`
  - `docs-terminai/voice.md` -> `/docs/voice-mode`
  - `docs-terminai/web-remote.md` -> `/docs/web-remote`
  - Use `docs/sidebar.json` to generate the nav tree.

### 4. Download (`/download`)

- **Headline**: "Own Your Shell."
- **Install Methods**:
  - NPM: `npm i -g @google/gemini-cli`
  - Source: `git clone ...`
  - Script: `./scripts/termai-install.sh`
- (Source: `README.md` "Installation").

### 5. Zen (Equivalent: "Safety" or "Trust")

- _Note: You said "except Zen", but `terminaI` has a strong "Safety" angle which
  acts similarly as a "Curated/Trusted" mode._
- **Content**: Explain the "Trust Levels" and "Sandbox" architecture.
- (Source: `docs/safety-architecture.md`).

## Action Plan: Content Generation

I will now create a single markdown file
`docs-terminai/website_content_master.md` containing the **actual copy** for all
these pages, formatted as sections. You can then hand this file + the
`website_spec.md` to any developer (or me) to build the site.

**Shall I generate this Master Content File now?**
