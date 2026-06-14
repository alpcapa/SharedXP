# SharedXP — Corporate Identity & Brand Guidelines

**Document type**: Internal reference  
**Status**: Living document — updated as the brand evolves  
**Date**: June 2026  
**Source of truth**: `src/styles/index.css` (`:root` design tokens). When this document and the CSS disagree, the CSS tokens win — update this document to match.

---

## Table of Contents

1. [Brand Overview](#1-brand-overview)
2. [Logo & Wordmark](#2-logo--wordmark)
3. [Color Palette](#3-color-palette)
4. [Typography](#4-typography)
5. [Voice & Messaging](#5-voice--messaging)
6. [Usage in Code](#6-usage-in-code)
7. [Do & Don't](#7-do--dont)

---

## 1. Brand Overview

SharedXP connects travellers with local sport hosts — you train, play, and explore
with locals wherever you go. The identity is **warm, active, and human**: an earthy,
sun-warmed base (sand/terracotta) paired with a vivid, energetic green that signals
sport, movement, and the outdoors.

The personality:

- **Active, not corporate** — movement, play, the outdoors.
- **Warm, not clinical** — earthy backgrounds, human photography.
- **Local & welcoming** — the brand is a friendly host, not a faceless marketplace.

---

## 2. Logo & Wordmark

The logo is a **text wordmark**, not an image asset: `Shared` + `XP`.

| Part | Color | Token |
|------|-------|-------|
| `Shared` | near-black `#111` | — |
| `XP` | brand green `#7aaa2e` | `var(--brand)` |

Rendered in code as:

```jsx
<Link to="/" className="brand">
  Shared<span>XP</span>
</Link>
```

```css
.brand      { color: #111; font-weight: 800; font-family: var(--font-display); }
.brand span { color: var(--brand); }
```

**Rules**
- The `XP` is always brand green (`var(--brand)`), never a lighter or legacy green.
- Set the wordmark in the display typeface (Bricolage Grotesque), weight 800.
- Default display size token: `--brand-font-size: 39px`.
- Do not recolor `Shared` to anything other than near-black on light surfaces.

---

## 3. Color Palette

All brand colors are defined as CSS custom properties in `:root`
(`src/styles/index.css`). **Always reference the token, never the raw hex**, so a
future palette change propagates everywhere.

### Brand green (primary)

| Token | Hex | Use |
|-------|-----|-----|
| `--brand` | `#7aaa2e` | Primary brand green — logo `XP`, links, active states, accents, focus rings. **This is the canonical green.** |
| `--brand-dark` | `#4e7a14` | Hover/depth, gradient end-stops, emphasis. |
| `--brand-light` | `#d8edac` | Tinted backgrounds, subtle fills, hover surfaces. |

### Accent (terracotta)

| Token | Hex | Use |
|-------|-----|-----|
| `--accent` | `#c4622d` | Secondary CTA / accent (e.g. "Become a Host"), the hero "Anywhere." word. |
| `--accent-light` | `#f5ddd2` | Tinted accent backgrounds. |

### Surfaces & text

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#f7f1e8` | Page background (warm sand). |
| `--surface` | `#ffffff` | Cards, panels, raised surfaces. |
| `--text` | `#273033` | Default body text. |
| `--text-muted` | `#596164` | Secondary / muted text. |
| `--border` | `#e8e9e4` | Hairlines, dividers, input borders. |

### Retired legacy greens — do not use

The following were the old, lighter greens used before the palette was unified.
They have all been replaced by `var(--brand)` and **must not be reintroduced**:

`#96c93d` · `#97ca3f` · `#a7cf35`

For a translucent brand green (e.g. focus glow), use `rgba(122, 170, 46, <alpha>)`
rather than appending an alpha suffix to a hex literal.

---

## 4. Typography

Two variable fonts, both loaded locally (see `dist/assets/*.woff2`):

| Token | Family | Role |
|-------|--------|------|
| `--font-body` | Plus Jakarta Sans (Variable) | Body copy, UI, controls. |
| `--font-display` | Bricolage Grotesque (Variable) | Headings, hero text, the logo wordmark. |

Fallback stack for both ends in `system-ui, sans-serif`.

**Headings** use the display font with tight tracking. The homepage hero, for
example, uses `clamp(52px, 7vw, 84px)`, `line-height: 1.05`,
`letter-spacing: -1.6px`.

---

## 5. Voice & Messaging

Tone: **welcoming, energetic, concrete.** Speak like a well-travelled local friend —
encouraging and plainspoken, never salesy or jargon-heavy.

**Primary tagline**

> Train, play, and explore with locals — wherever you travel.

**Hero headline**

> Find a local sport host. **Anywhere.**

Writing conventions:
- Lead with the verbs of doing: *train, play, explore, meet, discover*.
- Use the em dash (—), not a hyphen, in taglines and display copy.
- Keep sentences short; favour active voice.
- "Locals" and "hosts" are central nouns — keep them prominent.

---

## 6. Usage in Code

- All brand values live as tokens in `:root` in `src/styles/index.css`.
- **Reference tokens, never raw hex** in component styles: `color: var(--brand);`.
- Need a tint or shade? Reach for `--brand-light` / `--brand-dark` before inventing
  a new value. If you need a new shade, add it as a token in `:root` and document it
  here — do not hardcode it inline.
- Translucent brand green → `rgba(122, 170, 46, <alpha>)`.
- The hero "Anywhere." accent is intentionally terracotta (`var(--accent)`), not
  green — this is a deliberate contrast point, not an inconsistency.

---

## 7. Do & Don't

**Do**
- Use `var(--brand)` for every solid green accent so it matches the logo.
- Keep the warm sand background (`--bg`) as the default canvas.
- Pair green with terracotta sparingly for emphasis.

**Don't**
- Don't reintroduce the legacy greens (`#96c93d`, `#97ca3f`, `#a7cf35`).
- Don't hardcode brand hex values inline — always use the token.
- Don't recolor the logo `XP` to any green other than `var(--brand)`.
- Don't swap the em dash for a hyphen in display taglines.
