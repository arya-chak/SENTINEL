# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** SENTINEL
**Generated:** 2026-03-16
**Category:** Military C2 / Cybersecurity Platform
**Inspired by:** Palantir Gotham, Anduril EagleEye / Lattice

---

## Design Philosophy

SENTINEL is a professional operational tool, not a sci-fi game or hacker movie.
The visual language is **restrained, dense, and functional**. Every pixel earns
its place by conveying information. Operators under stress need instant
legibility — not glowing animations, not decorative noise.

Reference aesthetic: dark navy workspace, crisp monospaced data labels,
color used exclusively for semantic meaning (threat states), no decoration.

---

## Color Palette

### Background layers (darkest to lightest)

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Void | `#0a0a0f` | `--color-bg-void` | Body background, outermost shell |
| Surface | `#0f0f1a` | `--color-bg-surface` | Panel backgrounds (Header, TargetQueue, DossierPanel) |
| Elevated | `#141428` | `--color-bg-elevated` | Cards, queue rows, input backgrounds |
| Overlay | `#1e2035` | `--color-bg-overlay` | Borders, dividers, subtle separators |

### Text

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary | `#e2e8f0` | `--color-text-primary` | Main body text, entity names |
| Secondary | `#94a3b8` | `--color-text-secondary` | Labels, metadata, timestamps |
| Muted | `#4a5568` | `--color-text-muted` | Disabled states, tertiary info |
| Inverse | `#0a0a0f` | `--color-text-inverse` | Text on colored backgrounds |

### Accent

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary accent | `#378ADD` | `--color-accent` | SENTINEL wordmark, selected states, links, friendly units |
| Accent dim | `#1e4a7a` | `--color-accent-dim` | Accent hover backgrounds, focus rings |

### Semantic (entity threat states — DO NOT change these)

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Hostile | `#E24B4A` | `--color-hostile` | Hostile entity — queue border, map marker, dossier header |
| Ambiguous | `#EF9F27` | `--color-ambiguous` | Ambiguous entity — same pattern as hostile |
| Friendly | `#378ADD` | `--color-friendly` | Friendly unit — same as accent |
| Civilian | `#888780` | `--color-civilian` | Civilian entity |

### Status

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Live / online | `#22c55e` | `--color-status-live` | LIVE indicator in Header |
| Warning | `#EF9F27` | `--color-status-warning` | Countdown under 10s (same as ambiguous) |
| Danger | `#E24B4A` | `--color-status-danger` | Critical alerts (same as hostile) |

### Border

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Default border | `#1e2035` | `--color-border` | Panel edges, card borders |
| Subtle border | `#141428` | `--color-border-subtle` | Inner dividers |

---

## Typography

### Fonts

| Role | Font | Load method | Usage |
|------|------|-------------|-------|
| Display / HUD | `Share Tech Mono` | Google Fonts | SENTINEL wordmark, status labels, entity IDs, coordinate readouts |
| Body | `Inter Variable` | @fontsource-variable/inter (already installed) | All prose, queue rows, dossier content |
| Data / monospace | `Fira Code` | Google Fonts (optional) | Classifier scores, lat/lon values, timestamps |

### Google Fonts import (add to index.css)

```css
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Fira+Code:wght@400;500&display=swap');
```

### Type scale

| Token | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| `--text-wordmark` | `14px` | `700` | Share Tech Mono | SENTINEL header logo |
| `--text-label` | `11px` | `600` | Share Tech Mono | Status badges, entity type labels |
| `--text-body` | `13px` | `400` | Inter | Queue rows, dossier body text |
| `--text-body-sm` | `12px` | `400` | Inter | Secondary metadata, timestamps |
| `--text-data` | `12px` | `400` | Fira Code | Scores, coordinates, raw data values |
| `--text-heading` | `13px` | `600` | Inter | Panel section headings |

---

## Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Icon gaps, tight inline spacing |
| `--space-sm` | `8px` | Between related elements |
| `--space-md` | `12px` | Standard internal padding |
| `--space-lg` | `16px` | Panel padding, card padding |
| `--space-xl` | `24px` | Section separation |
| `--space-2xl` | `32px` | Major layout gaps |

---

## Layout

### Three-panel shell

```
┌─────────────────────────────────────────────────────┐
│  HEADER  (48px fixed, bg: --color-bg-surface)        │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│ TARGET QUEUE │           MAP VIEW                    │
│  (280px)     │        (flex: 1)                      │
│              │                                       │
├──────────────┴──────────────────────────────────────┤
│  DOSSIER PANEL  (slides up on select, ~280px)        │
└─────────────────────────────────────────────────────┘
```

- Header: `height: 48px`, `border-bottom: 1px solid var(--color-border)`
- TargetQueue: `width: 280px`, `flex-shrink: 0`, `border-right: 1px solid var(--color-border)`
- MapView: `flex: 1`, no padding
- DossierPanel: `position` animated via Framer Motion, slides up from bottom

---

## Component Specs

### Header bar

```css
.header {
  height: 48px;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 var(--space-lg);
  gap: var(--space-xl);
  flex-shrink: 0;
}

.header-wordmark {
  font-family: 'Share Tech Mono', monospace;
  font-size: var(--text-wordmark);
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--color-accent);
}
```

### Queue row

```css
.queue-row {
  border-left: 3px solid var(--entity-color); /* set inline via entity type */
  background: var(--color-bg-elevated);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  transition: background 150ms ease;
}

.queue-row:hover {
  background: var(--color-bg-overlay);
}
```

### Buttons

```css
/* Approve / primary action */
.btn-approve {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border: none;
  cursor: pointer;
  transition: opacity 150ms ease;
}
.btn-approve:hover { opacity: 0.85; }

/* Deny / destructive */
.btn-deny {
  background: var(--color-hostile);
  color: white;
  /* same shape as approve */
}

/* Ghost / secondary */
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  /* same shape as approve */
}
.btn-ghost:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

### Score / data bars

```css
.score-bar-track {
  height: 4px;
  background: var(--color-bg-overlay);
  border-radius: 2px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 300ms ease;
  /* color set inline based on value:
     0–0.4: --color-civilian
     0.4–0.7: --color-ambiguous
     0.7–1.0: --color-hostile */
}
```

### Dossier panel

```css
.dossier {
  background: var(--color-bg-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--space-lg);
}

.dossier-header {
  border-left: 3px solid var(--entity-color);
  padding-left: var(--space-md);
  margin-bottom: var(--space-lg);
}
```

---

## Animation

Permitted animations only — no glitch, no scanlines, no matrix rain.

| Effect | Spec | Usage |
|--------|------|-------|
| Slide up | `y: 200 → 0, opacity: 0 → 1, duration: 200ms` | DossierPanel mount |
| Fade in | `opacity: 0 → 1, duration: 150ms` | Queue row AnimatePresence |
| Pulse | `opacity 1 → 0.4 → 1, 1.5s infinite` | LIVE indicator dot only |
| Bar fill | `width transition 300ms ease` | Score bars on mount |

All animations must respect `prefers-reduced-motion: reduce`.

---

## Anti-Patterns — DO NOT USE

- ❌ `#00FF41` matrix green — wrong domain, reads as hacker cosplay
- ❌ Glitch animations (skew, offset, chromatic aberration)
- ❌ Scanline overlays (`::before` repeating-linear-gradient)
- ❌ Neon glow (`text-shadow` neon effects)
- ❌ Pure `#000000` black backgrounds — use `#0a0a0f` void instead
- ❌ Rounded corners > `6px` on operational components (cards, buttons, rows)
- ❌ Consumer-app shadows (`box-shadow` with large blur) — use borders instead
- ❌ Light mode — this UI is dark-only
- ❌ Gradients on backgrounds — flat fills only
- ❌ Emojis as icons — Lucide React only (already installed)
- ❌ Font sizes below `11px`
- ❌ Missing `cursor: pointer` on any interactive element
- ❌ State changes without transitions (minimum `150ms ease`)

---

## Pre-Delivery Checklist

Before delivering any component:

- [ ] All colors reference CSS variables, no hardcoded hex
- [ ] Entity color applied via `--color-hostile / --color-ambiguous / --color-friendly / --color-civilian`
- [ ] `cursor: pointer` on all clickable elements
- [ ] Hover states with `150–300ms ease` transitions
- [ ] No glitch, scanline, or neon effects
- [ ] `prefers-reduced-motion` respected on all animations
- [ ] All icons from Lucide React (no emojis)
- [ ] Font sizes: minimum `11px`, Share Tech Mono for HUD labels, Inter for body
- [ ] Focus states visible (outline or border-color change)
- [ ] Contrast: text on dark backgrounds minimum 4.5:1