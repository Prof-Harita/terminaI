# TerminaI UI Architecture

> [!NOTE] This document describes the technical architecture for the new
> "Industrial Minimalist" TUI. **Critical Finding**: TerminaI already has a
> production-ready Mouse System. No new library is required.

## 1. Existing Mouse Infrastructure ✅

TerminaI's codebase already contains:

| Component         | Location                       | Capability                                 |
| :---------------- | :----------------------------- | :----------------------------------------- |
| `MouseContext`    | `ui/contexts/MouseContext.tsx` | Global mouse event subscription system     |
| `useMouse`        | `ui/contexts/MouseContext.tsx` | Subscribe to raw mouse events              |
| `useMouseClick`   | `ui/hooks/useMouseClick.ts`    | **Hit-testing** via Ink's `getBoundingBox` |
| `parseMouseEvent` | `ui/utils/mouse.ts`            | Parses SGR (1006) and X11 mouse sequences  |

**Key Point**: The `useMouseClick` hook already performs bounding-box
hit-testing using `ink.getBoundingBox()`. This means we can detect clicks
_inside specific components_.

## 2. What We Have vs What We Need

| Feature                  | Status             | Notes                                          |
| :----------------------- | :----------------- | :--------------------------------------------- |
| Click Detection          | ✅ Implemented     | `useMouseClick` hook                           |
| Scroll Detection         | ✅ Implemented     | `scroll-up`, `scroll-down` events              |
| Hover Detection          | ⚠️ Partially       | `move` events exist, need `useMouseHover` hook |
| Visual Feedback on Hover | ❌ Not Implemented | Need `InteractiveBox` component                |

## 3. Path Forward (Very Low Effort)

### 3.1 Add `useMouseHover` Hook

A new hook mirroring `useMouseClick` but for the `move` event.

```typescript
// ui/hooks/useMouseHover.ts
export const useMouseHover = (
  containerRef: React.RefObject<DOMElement | null>,
  onHoverEnter: () => void,
  onHoverLeave: () => void,
) => {
  const [isHovered, setIsHovered] = useState(false);
  useMouse((event: MouseEvent) => {
    if (event.name === 'move' && containerRef.current) {
      const isInside = /* ... getBoundingBox check ... */;
      if (isInside && !isHovered) { setIsHovered(true); onHoverEnter(); }
      if (!isInside && isHovered) { setIsHovered(false); onHoverLeave(); }
    }
  });
};
```

### 3.2 Create `InteractiveBox`

A styled `Box` that uses `useMouseClick` + `useMouseHover` to change its visual
state.

```typescript
// ui/kit/InteractiveBox.tsx
export const InteractiveBox = ({ children, onClick, hoverStyle }) => {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  useMouseClick(ref, onClick);
  useMouseHover(ref, () => setHovered(true), () => setHovered(false));
  return <Box ref={ref} {...(hovered ? hoverStyle : {})}>{children}</Box>;
};
```

## 4. Directory Structure (No Major Changes)

```
packages/cli/src/ui/
├── contexts/
│   └── MouseContext.tsx    # ✅ Already exists
├── hooks/
│   ├── useMouseClick.ts    # ✅ Already exists
│   └── useMouseHover.ts    # [NEW] Tiny addition (~30 lines)
├── kit/
│   └── InteractiveBox.tsx  # [NEW] Wrapper component
└── views/
    ├── FocusView.tsx       # [NEW] Zen-like home screen
    └── ...
```

## 5. Why NOT to use `@opentui`

| Factor             | `@opentui`                 | Keep React+Ink                  |
| :----------------- | :------------------------- | :------------------------------ |
| Framework          | SolidJS (full rewrite)     | React (current)                 |
| Effort             | **Weeks/Months**           | **Days**                        |
| Functionality Loss | All existing features gone | Zero loss                       |
| Mouse Support      | Built-in                   | **Already Built** (just extend) |

**Verdict**: Using `@opentui` would mean rewriting the entire UI layer from
scratch. The aesthetic benefits can be achieved with the current stack by simply
_polishing_ components and _extending_ the existing mouse hooks.
