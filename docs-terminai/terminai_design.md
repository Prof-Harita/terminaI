# terminaI Design Language

## Core Identity

**terminaI** is a system-aware terminal operator. It is not just a chatbot; it
is a tool that owns the shell. The design reflects this: utility-first,
minimalist, precision-engineered.

## Logo & Logotype

The logo consists strictly of the wordmark `termina` followed by a stylized `I`.

### Construction

- **Text**: `termina`
- **Suffix**: `I` (Capital 'i')
- **Font Family**: **Geist Mono** (closest open-source alternative to modern
  proprietary console fonts) or **JetBrains Mono**.
- **Weight**:
  - `termina`: Regular / Medium (400/500)
  - `I`: Bold / ExtraBold (700/800)

### The "Pulse" (The Red I)

The `I` at the end represents the cursor, the AI agent's presence, and the
"Intelligence".

- **Color**: IBM ThinkPad Red
  - HEX: `#E2231A`
  - RGB: `226, 35, 26`
- **Animation**:
  - **State**: Always blinking when active/thinking. Static when idle? Or always
    blinking like a terminal cursor.
  - **Style**: "Hard" cursor blink (on/off) to emphasize the terminal nature.
    - Duration: 1s loop (500ms ON, 500ms OFF).

### Usage Variations

#### Dark Mode (Default)

- **Background**: `#000000` (Pure Black) or `#111111` (Near Black)
- **`termina` Color**: `#FFFFFF` (White)
- **`I` Color**: `#E2231A` (Red)

#### Light Mode

- **Background**: `#FFFFFF` (White)
- **`termina` Color**: `#000000` (Black)
- **`I` Color**: `#E2231A` (Red)

## Typography

### Primary Typeface: Geist Mono

Used for the logo, code blocks, headers, and UI elements.

- **Why**: Geometric, legible at small sizes, "square" aesthetic fitting modern
  developer tools (Vercel, etc.).
- **Fallback**: JetBrains Mono, Roboto Mono.

## Design Principles

1.  **Form Follows function**: No decorative elements. If it doesn't convey
    status or data, remove it.
2.  **High Contrast**: Adhere to strict Black/White + Accent Red. avoid greys
    unless for disabled states.
3.  **Monospace Everything**: Even UI text should prefer monospace to reinforce
    the CLI-native identity.

## References

Inspiration drawn from:

- [factory.ai](https://factory.ai/) (Industrial minimalism)
- [warp.dev](https://www.warp.dev/) (Modern terminal UI)
- [opencode.ai](https://opencode.ai/)
