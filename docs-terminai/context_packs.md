# Context Packs

Context Packs are templates for `terminaI.md` files tailored to specific types
of projects. They help jumpstart the "context" for TerminaI, ensuring it
understands the nuances of the environment it's working in.

## How to use

Copy the relevant template below into your `terminaI.md` file and fill in the
details.

## Templates

### Node.js / TypeScript Service

```markdown
# Context: [Service Name]

## Project Overview

This is a Node.js/TypeScript backend service.

- **Framework**: [e.g. Express, NestJS, Fastify]
- **Language**: TypeScript
- **Runtime**: Node.js [Version]

## Project Operator Contract

- **Testing**: Always run \`npm test\` before committing.
- **Linting**: Ensure \`npm run lint\` passes.
- **Package Manager**: Use \`npm\` [or pnpm/yarn].
- **Imports**: Use explicit file extensions (ESM) if applicable.

## Building and Running

- Build: \`turbo run build\`
- Start: \`npm run start\`
- Dev: \`npm run dev\`

## Architecture

- [Brief description of modules/layers]
```

### React / Frontend App

```markdown
# Context: [App Name]

## Project Overview

This is a React frontend application.

- **Framework**: [Create React App / Vite / Next.js]
- **Styling**: [Tailwind / CSS Modules / Styled Components]
- **State**: [Redux / Context / Zustand]

## Project Operator Contract

- **Confirm UI Changes**: If changing UI components, verify with a browser
  snapshot or manual review request.
- **Components**: Prefer functional components with Hooks.
- **Formatting**: Use Prettier.

## Commands

- Dev Server: \`npm start\`
- Build: \`turbo run build\`
- Test: \`npm test\`
```

### Python Script / CLI

```markdown
# Context: [Script Name]

## Project Overview

A standalone Python tool/script.

## Project Operator Contract

- **Virtual Env**: Always ensure venv is active (`source venv/bin/activate`).
- **Type Hints**: Use type hints (mypy) where possible.
- **Formatting**: Adhere to Black/PEP8.

## Usage

\`python main.py [args]\`

## Dependencies

Managed via \`requirements.txt\` or \`pyproject.toml\`.
```
