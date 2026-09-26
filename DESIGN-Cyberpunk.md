# SaaS Kit v3 — Cyberpunk Design System

**Aesthetic:** Cyberpunk / Glitch — "High-Tech, Low-Life"
**Scheme class:** `theme-cyber` (default color scheme)
**Last Updated:** 2026-09-26

> This document describes the Cyberpunk scheme **as implemented**. `DESIGN.md` covers the
> original enterprise-minimal system and is intentionally left unchanged.

---

## Vision

A digital-dystopia interface: a void-black canvas lit by neon, CRT scanlines, chromatic
aberration, and hard 45° corner cuts instead of rounded rectangles. It should feel like a
hacked terminal feed, not a clean utopian dashboard.

**Principles**

- **The void vs. the light.** Near-black surfaces; neon (green, magenta, cyan) is the light source and the hierarchy.
- **Imperfect technology.** Scanlines, RGB splitting and occasional glitches are features, used sparingly.
- **Industrial brutalism.** Chamfered corners, precise 1px HUD borders, monospace everywhere.
- **Restraint where data lives.** Marketing gets the full effect; dashboards get tokens, chamfers and type only, never glitch animation.

---

## How the scheme is wired

Cyberpunk is **one selectable color scheme** alongside `theme-green` and `theme-neutral`, not a rewrite.

| Concern | Where |
| :--- | :--- |
| Valid schemes, labels, default, resolver | `lib/constants.ts`: `COLOR_SCHEMES`, `COLOR_SCHEME_LABELS`, `DEFAULT_COLOR_SCHEME = 'theme-cyber'`, `resolveColorScheme()` |
| Persisted preference | `User.colorScheme` (DB default `theme-cyber`, migration `20260926000000_set_default_theme_cyber`) |
| Server validation | `lib/orpc/routers/user.ts`: `colorSchemeSchema = z.enum(COLOR_SCHEMES)` (the value is rendered as a `<body>` class) |
| Applied to | `<body class="theme-cyber">` in `app/layout.tsx`, kept in sync by `components/ThemeInitializer.tsx` |
| Shared token roles (all schemes) | `app/globals.css`: `@theme inline` |
| Everything Cyberpunk-specific | `app/styles/theme-cyber.css` (imported by `globals.css`) |
| Components | `components/cyber/*` |

**Every Cyberpunk rule is gated on `.theme-cyber`.** Components in `components/cyber` render plain,
theme-neutral markup; their effects only switch on under the scheme. Under Green or Neutral they
degrade to clean, on-brand components (effects fall back to `--primary` or no glow).

**Dark-only.** `.theme-cyber` has no light variant. The `dark:` variant is widened to
`(&:is(.dark *, .theme-cyber *))` so shadcn's dark tweaks always apply, `color-scheme: dark` is set,
and the light/dark toggle is hidden via `.theme-cyber [data-slot='theme-toggle']`.

---

## Color System

### Palette (`.theme-cyber`)

```css
--background:        #0a0a0f   /* void black, slight blue undertone */
--foreground:        #e0e0e0   /* primary text, not pure white */
--card / --popover:  #12121a   /* deep purple-black surface */
--muted / --secondary: #1c1c2e /* elevated chrome */
--muted-foreground:  #858b9b   /* see deviations */
--border / --input:  #2a2a3a   /* --input is shadcn's field *border* colour */
--destructive:       #ff3366

--neon:              #00ff88   /* PRIMARY NEON (primary, ring, sidebar-primary) */
--neon-secondary:    #ff00ff   /* hot magenta */
--neon-tertiary:     #00d4ff   /* electric cyan */

--primary:           var(--neon)
--primary-foreground:#0a0a0f
--accent:            color-mix(in srgb, var(--neon) 12%, #12121a)  /* menu/hover surface */
--accent-foreground: var(--neon)
--ring:              var(--neon)
```

**Mapping note:** the source spec's `accent` (neon green) maps to shadcn's `primary`/`ring`. shadcn's
`accent` is the hover/menu surface, so it becomes a neon-tinted card.

### Status roles (all schemes)

Use these, never raw palette classes (`emerald-500`, `amber-600`, …):

| Token | Utility | Cyberpunk | Green / Neutral (light · dark) |
| :--- | :--- | :--- | :--- |
| `--success` | `text-success`, `bg-success/10` | `var(--neon)` | emerald-700 · emerald-500 |
| `--warning` | `text-warning` | `#ffd000` | amber-700 · amber-500 |
| `--info` | `text-info` | `var(--neon-tertiary)` | blue-600 · blue-500 |
| `--destructive` | `text-destructive` | `#ff3366` | scheme default |

Light variants use the -700/-600 steps so small text clears WCAG AA on white.

### Categorical palette (charts, category accents)

`--chart-1…5` = neon · magenta · cyan · `#ffd000` · `#ff8a00`.
`chart-5` is deliberately **not** `#ff3366`: a category must never read as an error.

**Rules:** one series = one colour (`bg-chart-1`, not a colour per bar). Deltas are coloured by
sign (`text-success` / `text-destructive`). Neutral figures stay `text-foreground`.

### Neon utilities (all schemes; fall back gracefully)

| Utility | Resolves to |
| :--- | :--- |
| `text-neon`, `bg-neon/10`, `border-neon/30` | `var(--neon, var(--primary))` |
| `text-neon-secondary`, `text-neon-tertiary` | magenta / cyan, else `--primary` |
| `shadow-neon-sm`, `shadow-neon`, `shadow-neon-lg` | stacked neon glow, else no shadow |
| `shadow-neon-secondary`, `shadow-neon-tertiary` | magenta / cyan glow |

In arbitrary values, reference the raw tokens with a fallback, e.g.
`[--edge:var(--neon,var(--primary))]`. `@theme inline` values are not emitted as CSS variables.

---

## Typography

### Font stack (loaded in `app/layout.tsx`, `preload: false`)

Users on other schemes never download these files.

| Role | Face | Variable | Utility |
| :--- | :--- | :--- | :--- |
| Headings (h1–h4) | Orbitron | `--font-cyber-display` → `--font-display` | `font-heading` |
| Body / code | JetBrains Mono | `--font-cyber-mono` → `--font-mono` | `font-mono` (and `<body>`) |
| Labels, badges, buttons | Share Tech Mono | `--font-cyber-label` → `--label-face` | `font-label` |

Under other schemes `font-heading` is Bricolage Grotesque and `font-label` falls back to `font-mono`.

### Scale & styling

- **h1, h2, h3 and the site name** (`[data-slot='site-name']`): uppercase, `letter-spacing: 0.08em` (base layer, so utilities still win).
- **Hero h1:** `text-5xl md:text-7xl xl:text-8xl font-black tracking-wider`, via `<GlitchHeading>`.
- **Section h2:** `text-3xl md:text-4xl lg:text-5xl font-bold`.
- **Labels:** `font-label text-xs tracking-[0.2em] uppercase` (eyebrows, table heads, card titles, KPIs).
- **Body:** monospace, `letter-spacing: 0.025em`, `leading-relaxed`.
- **Root font-size** stays 14px (dashboard density).

Proportional Orbitron digits vary in width. Give step numbers or indices a fixed-width column (`grid-cols-[3.25rem_1fr]`).

---

## Shape: Chamfers & Edges

`--radius: 0px`, so every radius-token utility (`rounded-md`, `rounded-xl`, …) goes square.
**Fixed radii (`rounded-2xl`, `rounded-[2rem]`, `rounded-full`) do not follow the token.**
Prefer `rounded-xl` for large surfaces so they square off under Cyberpunk and stay rounded elsewhere.

### Corner cuts

| Token | Size | Applied to |
| :--- | :--- | :--- |
| `--chamfer` | 10px | cards, dialogs, `.cyber-chamfer` |
| `--chamfer-sm` | 6px | buttons, inputs, selects, menus, tooltips, tabs list, avatars, `.cyber-chamfer-sm` |
| `--chamfer-xs` | 4px | badges |

### Edge strokes

A clip-path also cuts the border at each corner. Four corner gradients redraw a line along each
cut so bordered panels read as closed.

| Knob | Default | Purpose |
| :--- | :--- | :--- |
| `--edge` | `var(--border)` | stroke colour; states change it with the border |
| `--edge-width` | `1px` | match the border width (`2px` on 2px borders) |
| `--chamfer-size` | per element | override a single element's cut |

Strokes are automatic on the retrofitted primitives. On custom elements, opt in with `.cyber-edge`
(an unbordered fill needs no stroke). **A call site with a custom border colour must set a matching
`--edge`**, e.g. `border-warning/50 [--edge:color-mix(in_srgb,var(--warning)_50%,transparent)]`.

### The clip-path constraint

`clip-path` clips everything outside the border box, **including outer `box-shadow`s and focus rings**. So:

- Glows and focus rings on chamfered elements are drawn **inset**.
- An outer glow that follows the chamfer goes on an **unclipped wrapper** with `filter: drop-shadow(...)`. `CyberButton` and the product-preview frame do this.
- Unclipped surfaces (sheets, `HudPanel`) may use real outer `box-shadow` glows.
- `clip-path` creates a stacking context. An absolutely positioned sibling that should sit on top needs `z-10` (see `CyberInput`).

---

## Cascade layers (read before adding rules)

`theme-cyber.css` deliberately spreads rules across layers:

| Layer | What lives there | Why |
| :--- | :--- | :--- |
| unlayered | token block, `body.theme-cyber` fonts, scanlines, `cyber-only` | must beat next/font's unlayered classes on `<body>` |
| `@layer base` | heading case/tracking | per-element utilities still win |
| `@layer components` | chamfer geometry, edge strokes, knob defaults, GlitchHeading | **any** utility overrides them (`[--edge:…]`, `[clip-path:none]`) |
| `@layer utilities` | primitive retrofit (colours, focus, states), CyberButton glow | must beat the primitives' own base utilities |

**Rules of thumb**

- Shared selector lists use `:where(...)`. `:is()` takes its *most specific* argument, which silently out-ranked per-component rules during the build.
- The inset-focus rule is **last** in the utilities layer, so equal-weight hover rules cannot mask it.
- Keyframes referenced by name from `theme-cyber.css` (`rgb-shift`, `glitch`, `blink`, `scanline`) are hoisted out of `@theme`, which only emits keyframes for `animate-*` utilities actually in use.
- Tailwind only sees **literal** class strings. Never build classes with template interpolation.

---

## Components

### shadcn primitives (retrofitted in CSS, no call-site changes)

Targeted through `data-slot` / `data-variant` hooks. `Button` exposes `data-variant`/`data-size`; the
dialog contents and the tooltip arrow gained `data-slot`s.

| Primitive | Cyberpunk treatment |
| :--- | :--- |
| Button | Chamfer-sm, `font-label` uppercase `0.12em`. `default` = solid neon (brightens on hover). `outline` = neon on hover. `secondary` = magenta outline. `destructive` = outlined, fills on hover. `link` = normal case, no chamfer. |
| Input / SelectTrigger | Chamfer-sm, `#12121a` fill, neon text and caret, red edge when `aria-invalid` |
| Card | Chamfer, edge strokes, no shadow. Interactive cards (`a`/`button`) lift 1px and glow on hover. |
| Card title, sidebar group label, Label | `font-label` uppercase |
| Dialog / AlertDialog | Chamfer, neon-35% edge, inner glow |
| Sheet | Not chamfered (edge-docked), real outer glow |
| Select / Dropdown content | Chamfer-sm, neon-30% edge; highlighted row gets a 2px neon rail |
| Tooltip | Card fill, neon text, `font-label`; arrow hidden (the clip would leave a stub) |
| Tabs | Chamfered list; active trigger = accent fill, neon text, 2px underline |
| Table | Heads in `font-label` uppercase; hovered row gets a neon rail |
| Badge / Avatar | Square, chamfered |
| Sidebar menu button | Active item gets a neon rail |

**Focus (all interactive primitives):** `inset 0 0 0 1px ring` + `inset 0 0 0 3px background` + inner
glow. The dark band keeps focus visible on solid neon buttons.

### `components/cyber/*`

| Component | Use | Notes |
| :--- | :--- | :--- |
| `GlitchHeading` | Hero headline (h1–h3) | Plain-text children; static RGB split plus a slice/skew burst in the last ~10% of a 7s cycle. Copies are CSS-only and hidden from AT via `content: attr(data-text) / ''`. |
| `TypewriterText` | Hero subtitle | Full text always in the DOM (`sr-only`); the untyped remainder is rendered invisibly, so no layout shift. Instant under reduced motion. Client component. |
| `BlinkingCursor` | Terminal prompts | Decorative (`aria-hidden`) |
| `CircuitGrid` | Section backdrops | `pattern="grid" \| "circuit"`, `fade`, `mesh`. Needs a `relative isolate` parent. |
| `NoiseOverlay` | Hero grain | `cyber-only`: hidden under other schemes |
| `TerminalCard` + `TerminalLine` | Terminal sections, logs | Window dots + title bar; `prompt` `>`/`$`/`#`/`null`; tones `default`/`muted`/`success`/`error` |
| `HudPanel` | Holographic HUD, mission panels | Translucent, blurred, bracket corners, outer glow; not chamfered |
| `CyberButton` | Marketing CTAs | Variants `primary`/`secondary`/`outline`/`ghost`/`glitch`; `asChild`. 44px default height. Glow via `drop-shadow` on the unclipped button; fill on an inner plate. |
| `CyberInput` | Terminal-prompt fields | Shared `Input` + `>` prompt, 44px |
| `IconFrame` | Icon housing | Tones `neon`/`secondary`/`tertiary`; icons glow on hover of the frame or any `group` ancestor |
| `CyberLabel` | Section eyebrow | `// 01 LABEL` |
| `StatStrip` | Key figures (`<dl>`) | 2×2 on mobile, 4-up with dividers from `md` |
| `TerminalEmptyState` | Empty collections | `$ 0 workspaces found` readout + icon, copy, action |

**When to use which button:** `CyberButton` on marketing surfaces (bigger, glowing, touch-sized);
`components/ui/button` in product UI (dense, already restyled by the scheme).

### Marketing page building blocks

| Block | File |
| :--- | :--- |
| Section header (eyebrow + h2 + lede) | `app/(marketing)/_components/landing/section-heading.tsx` |
| Secondary-page header (eyebrow + h1 + lede over a grid) | `app/(marketing)/_components/marketing-page-header.tsx` |
| Landing sections | `landing/landing-hero`, `product-preview`, `feature-grid`, `how-it-works`, `testimonials`, `pricing-section` |

---

## Textures & Motion

### Textures

- **Scanlines:** `body.theme-cyber::after`, 2px bands at `--scanline-alpha` (0.2), fixed over the viewport, `pointer-events: none`, hidden in print.
- **Grid / circuit:** `CircuitGrid`, 50px grid at 5% neon plus an optional PCB-trace SVG pattern.
- **Mesh:** `CircuitGrid mesh`, neon and magenta radial washes in opposite corners.
- **Noise:** `NoiseOverlay`, SVG turbulence at 6%.

### Motion

| Utility / keyframes | Timing | Used by |
| :--- | :--- | :--- |
| `animate-blink` | `1s step-end infinite` | `BlinkingCursor` |
| `animate-glitch` | `0.3s` one-shot jitter | available for hover glitches |
| `animate-rgb-shift` | `2.5s` chromatic pulse | glitch button hover (`0.8s steps(2)`) |
| `animate-scanline` | `8s linear` sweep | available |
| `cyber-glitch-*` | `7s steps(1)` | `GlitchHeading` only |

Transitions are sharp: `150ms cubic-bezier(0.4, 0, 0.2, 1)` (inputs 200ms, cards 300ms).
**Glitch effects belong on marketing surfaces only**, never on data-dense screens.

---

## Layout Patterns

- **Max width:** `MARKETING_SURFACE_MAX_WIDTH` (`max-w-6xl lg:max-w-[76rem]`); sections `py-24 md:py-32`.
- **Hero:** `lg:grid-cols-[3fr_2fr]` (60/40), HUD panel `hidden lg:block`.
- **Overlap:** the product preview pulls up into the hero (`-mt-12 md:-mt-20`); the hero fades to `--background` at the bottom so there is no seam.
- **Skew:** skew the **backdrop band** (`-skew-y-2`), never the content, so copy stays level.
- **Feature grid:** 3 columns with a `row-span-2` featured card; check that cell counts close each row at every breakpoint.
- **Pricing:** featured plan `md:scale-105` with a primary edge (marketing mode only).
- **Footer:** stacked → 4 columns (`md:grid-cols-2 lg:grid-cols-4`).

---

## Accessibility

- **Contrast:** neon on void ≈ 15:1. `--muted-foreground` lifted to `#858b9b` (≥ 4.9:1 on `--muted`). Status tokens use AA-safe light variants.
- **Focus:** always visible and drawn inset (see above); never remove focus styles on chamfered controls.
- **Reduced motion:** `prefers-reduced-motion` disables blink, glitch, rgb-shift, scanline sweep, the GlitchHeading burst and the CyberButton animation. The static chromatic offset stays. `TypewriterText` shows the full text; the FAQ uses `MotionConfig reducedMotion="user"`.
- **Decoration hidden from AT:** glitch copies, cursors, prompts, window dots, corner brackets, background layers.
- **Semantics fixed during the migration:** one `<h1>` per page (the logo is a `<span>`); FAQ uses the heading → button accordion pattern with `aria-expanded`/`aria-controls`; filter chips use `aria-pressed`; icon-only social links have `aria-label`s.
- **Touch targets:** cyber components are ≥ 44px. Retrofitted shadcn controls keep their dense sizes (~32px at the 14px root).

---

## Deliberate Deviations from the Source Spec

| Spec | Implemented | Reason |
| :--- | :--- | :--- |
| `mutedForeground #6b7280` | `#858b9b` | #6b7280 is ≈ 4.2:1, below AA for 14px text |
| Scanline alpha 0.3 | 0.2 | 2px bands at 0.3 hurt 14px body legibility |
| Default button = transparent neon outline | shadcn `default` = solid neon; outline style is `CyberButton primary` | shadcn's default is the primary CTA across the product |
| Features grid `-skew-y-1` on container | skewed backdrop band | skewed text is harder to read |
| Glitch on all headings | hero only | spec: "subtle and infrequent" |
| `--input: #12121a` | `--input: #2a2a3a`; fill applied per component | shadcn uses `--input` as the field border colour |

---

## Extending

- **New Cyberpunk effect:** add it to `app/styles/theme-cyber.css` in the right layer, gated on `.theme-cyber`, with a reduced-motion override if it moves.
- **New cyber component:** theme-neutral markup plus token utilities; put effects behind `.theme-cyber` or `cyber-only`; `aria-hidden` on decoration.
- **New status or category colour:** use `success`/`warning`/`info`/`destructive` or `chart-1…5`, never raw palette colours.
- **New scheme:** add a `.theme-*` block (plus `.dark` if it isn't dark-only) defining every token, including `--success`, `--warning`, `--info` and `--chart-*`, then add it to `COLOR_SCHEMES` and `COLOR_SCHEME_LABELS`.

---

## Known Gaps

- The About page copy is template placeholder text (restyled, not rewritten).
- `theme-green`'s dark `chart-5` is red-adjacent (pre-existing palette).
- Terms, Privacy and `/about2` only inherit tokens; they have no bespoke layout.
- Unused effect components (`AnimatedGroup`, `HyperText`, `TextEffect`, `AnimatedShinyText`, `GLASS_CARD`) remain in the kit.
- Pre-existing `react-hooks/set-state-in-effect` lint errors in `Themetoggle`, `ToastProvider`, `invite-member-dialog`, `nav-user` and `sidebar`.
