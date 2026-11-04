---
name: mobile-first-ui
description: Mobile-first methodology for building UI that is excellent on a 320px phone and
  scales up — breakpoints, 44px touch targets, safe-area insets, fluid type/space with
  clamp(), responsive layout patterns (stack→grid), mobile performance budgets, and
  cross-viewport testing. Use when Marco says "tem que ficar bom no celular", "mobile
  primeiro", "responsivo", "quebra no telefone", "thumb-friendly", or when starting any
  screen (always start mobile). Pairs with frontend-quality-flow.
---

# Mobile-First UI

## Purpose / When to use
Most teams build desktop and "make it responsive" later by cramming. That produces tiny
tap targets, text you can't read, and layouts that reflow badly. Mobile-first inverts it:
design the smallest, most constrained view first (one column, thumb-reachable actions,
legible type), then *progressively enhance* upward with `min-width` breakpoints. The result
is a UI that is genuinely good on the device most users actually hold, and graceful — not
empty or stretched — on a 27" monitor.

Use this skill:
- At the **start** of any new screen (mobile-first is the default, not a retrofit).
- When an existing screen "quebra no celular": horizontal scroll, clipped content, buttons
  too small, menus that cover the whole screen.
- When Marco wants a catalog/landing/dashboard that must feel native on a phone.

**Como pedir (PT-BR):** "Faz mobile first", "deixa responsivo de verdade", "isso tá
quebrando no celular", "os botões tão pequenos no toque".

## Inputs you need
- The screen's primary task and the **one** action a thumb must reach easily.
- Target devices/viewports (default ladder: 320, 360, 390, 414 phones → 768 tablet →
  1024 → 1280 → 1440+ desktop).
- The design source of truth: read `~/.claude/DESIGN_SYSTEM.md` (mobile-first, premium
  spacing, breathing space) and `~/.claude/UX_RULES.md` (thumb-friendly, optimized touch
  targets, clean mobile hierarchy) **before** laying anything out.
- The token/Tailwind config: confirm the breakpoint values and the spacing/type scale.
- Whether the app ships as a PWA / runs in a webview (affects safe-area + viewport meta).

## Numbered Flow (stack-aware)
1. **Detect the stack.** Run `project-context-builder`. Branch:
   - **React + Vite:** Tailwind breakpoints come from `tailwind.config.*` (`sm:640
     md:768 lg:1024 xl:1280 2xl:1536`); ensure the viewport meta in `index.html` is
     `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
     (the `viewport-fit=cover` is what makes safe-area insets work).
   - **Next.js:** viewport lives in `export const viewport` (App Router) or `_document`;
     use `next/image` with `sizes` for responsive images; fonts via `next/font` to avoid
     CLS. Check `"use client"` for any interactive responsive logic.
   - **Tailwind v4** uses CSS-first `@theme`; v3 uses the JS config — read which is present.
2. **Read the design contract** (DESIGN_SYSTEM + UX_RULES) and note the spacing/type scale
   and the "breathing space / no cramped layouts" rule — mobile is where people violate it.
3. **Design the 320px view first.** Single column. Decide vertical order by importance.
   Put the primary action within thumb reach (bottom third of the screen on tall phones;
   a sticky bottom CTA bar is often correct). Hide nothing essential behind hover.
4. **Set fluid type and space with `clamp()`** so you interpolate *between* breakpoints
   instead of jumping. E.g. headings `clamp(1.5rem, 1.1rem + 2.5vw, 2.5rem)`, section
   padding `clamp(1rem, 0.5rem + 4vw, 4rem)`. This kills the "fine at 375 and 1440, ugly at
   600" problem. Keep a minimum so text never drops below 16px body / ~14px captions.
5. **Apply touch ergonomics.** Every tap target ≥ 44×44px (Apple HIG) / 48dp (Material),
   with ≥ 8px gaps so thumbs don't mis-tap. Increase hit area with padding, not by bloating
   the visual. No hover-only affordances.
6. **Add safe-area insets** for any fixed/sticky element: `padding-bottom:
   max(1rem, env(safe-area-inset-bottom))`, and top inset for sticky headers under the
   notch. Without this, bottom bars sit under the iOS home indicator.
7. **Progressively enhance upward.** Layer `md:` / `lg:` to go stack → grid, reveal a
   persistent sidebar, widen the measure, and add hover affordances that are *enhancements*,
   never requirements. Use container queries (`@container`) for components that must adapt
   to their slot rather than the viewport (cards reused in narrow + wide regions).
8. **Choose the right responsive layout pattern** (see catalog below) per region: stack→grid,
   off-canvas nav, table→cards, sticky CTA, content reflow.
9. **Budget mobile performance.** Ship less JS to phones, lazy-load below-the-fold images
   (`loading="lazy"` / `next/image`), use responsive `srcset`/`sizes`, defer non-critical
   work, and keep the largest contentful element light. Target LCP < 2.5s, CLS < 0.1, INP
   < 200ms on a mid-tier Android over 4G.
10. **Test across viewports.** DevTools device toolbar across the ladder, real-device check
    if possible (iOS Safari + Android Chrome behave differently for safe-areas, 100vh, and
    momentum scroll). Then hand to `frontend-quality-flow` for the full state/a11y pass.

## Full Checklist
### Breakpoints & strategy
- [ ] Authored mobile-first: base styles are the smallest view, enhanced with `min-width`.
- [ ] No `max-width` desktop-down hacks layered on top of a desktop base.
- [ ] Breakpoints chosen by content (where the layout breaks), not by device names.
- [ ] Container queries used for components reused in different-width slots.

### Touch & ergonomics
- [ ] Every interactive target ≥ 44×44px with ≥ 8px spacing.
- [ ] Primary action reachable by thumb (bottom zone / sticky CTA on tall screens).
- [ ] No essential function is hover-only; tap = the primary interaction model.
- [ ] Swipe/drag gestures have a visible non-gesture fallback.
- [ ] Inputs use correct `inputmode`/`type` (`email`, `tel`, `numeric`) so the right
      keyboard appears; `autocomplete` set; no zoom-on-focus (font-size ≥ 16px on inputs).

### Fluid type & space
- [ ] Type uses `clamp()` (or a fluid scale) between min/max — no abrupt jumps.
- [ ] Body ≥ 16px on mobile; line-height 1.5–1.7; measure ≤ ~38ch on phone, 60–75ch wide.
- [ ] Spacing/padding fluid via `clamp()` so sections breathe at every width.
- [ ] No fixed pixel widths that cause horizontal scroll at 320px.

### Safe areas & viewport
- [ ] `viewport-fit=cover` set; `env(safe-area-inset-*)` applied to fixed/sticky bars.
- [ ] Avoid `100vh` for full-height (mobile URL bar bug) — use `100dvh`/`100svh`.
- [ ] Sticky header/footer don't overlap content or sit under the notch/home indicator.

### Responsive layout patterns
- [ ] Stack → grid: one column on mobile, `grid-cols-N` from `md:`/`lg:` up.
- [ ] Navigation: off-canvas/drawer or bottom-tab on mobile → persistent sidebar/topnav up.
- [ ] Tables: transform to stacked cards (or horizontal scroll w/ sticky first col) on phone.
- [ ] Modals become full-screen sheets on mobile; centered dialogs on desktop.
- [ ] Long content reflows; images use `aspect-ratio` to reserve space (no CLS).

### Mobile performance
- [ ] Images responsive (`srcset`/`sizes` or `next/image`), lazy below the fold.
- [ ] JS shipped to mobile minimized (code-split, defer non-critical, no giant libs for one
      widget).
- [ ] Fonts: `font-display: swap` / `next/font`; preconnect critical origins.
- [ ] LCP < 2.5s, CLS < 0.1, INP < 200ms on mid-tier Android / 4G (Lighthouse mobile).
- [ ] No layout shift from late-loading images/ads/embeds.

### Testing
- [ ] Verified at 320 / 360 / 390 / 414 / 768 / 1024 / 1280 / 1440.
- [ ] Real iOS Safari + Android Chrome checked for safe-area, 100dvh, momentum scroll.
- [ ] Landscape phone checked (short height); orientation change doesn't break layout.
- [ ] Keyboard-up state on forms doesn't hide the active input behind the keyboard.

## Security & Quality rules
- **Tap-target accessibility is a quality gate**, not a nicety — sub-44px targets fail
  usability and WCAG 2.5.5/2.5.8 (target size).
- **`user-scalable=no` is forbidden** — never disable pinch-zoom; it breaks accessibility.
- **Don't ship desktop-weight payloads to phones** — large unused JS on mobile is a
  performance defect that also costs users real data/battery.
- **External/user-provided image URLs** go through the framework image layer with an
  allow-listed domain config (`next.config` `images.remotePatterns`) — prevents arbitrary
  remote fetches (SSRF-adjacent) and unoptimized payloads.
- **No secrets in client config** regardless of viewport (same rule as everywhere: `VITE_` /
  `NEXT_PUBLIC_` boundary).

## Real-world Example — a product catalog, mobile → desktop
Catalog page: filter bar, a grid of product cards, pagination.

**Mobile-first build (320px base):**
- Single column of cards; each card 100% width with `aspect-ratio: 4/5` image so the grid
  never shifts as images load.
- Filters collapse into a "Filtros" button that opens a **full-screen bottom sheet**
  (not a cramped dropdown). The sheet has a sticky "Aplicar" CTA with
  `padding-bottom: max(1rem, env(safe-area-inset-bottom))` so it clears the home indicator.
- Card title `clamp(0.95rem, 0.9rem + 1vw, 1.1rem)`; price stays prominent; "Adicionar"
  button is 48px tall, full-width, thumb-reachable.
- Images: `loading="lazy"` + responsive `sizes="(max-width: 768px) 100vw, 25vw"`.

**Progressive enhancement upward:**
- `sm:` → 2 columns; `lg:` → 3; `xl:` → 4 (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  xl:grid-cols-4 gap-[clamp(0.75rem,2vw,1.5rem)]`).
- `md:` → the filter bottom-sheet becomes a persistent left rail; the button disappears.
- Hover lift + quick-view appear only from `md:` up (enhancement, never required on touch).
- Card component uses a container query so the same card looks right in the wide grid and in
  a narrow "related products" rail.

**Result tested:** no horizontal scroll at 320, 48px targets, sheet clears the notch, LCP
2.1s on throttled mobile, clean reflow from 1 → 4 columns. Then `frontend-quality-flow`
added the empty ("Nenhum produto encontrado") and error states.

## Done criteria
- Designed at 320px first; enhanced upward with `min-width` breakpoints.
- All touch targets ≥ 44px, ≥ 8px apart; primary action thumb-reachable.
- Fluid type/space via `clamp()`; body ≥ 16px; no abrupt jumps between breakpoints.
- Safe-area insets applied; `100dvh` used; no horizontal scroll anywhere on the ladder.
- Layout patterns chosen correctly (stack→grid, drawer nav, table→cards, sheet modals).
- Mobile Core Web Vitals within budget (LCP < 2.5s, CLS < 0.1, INP < 200ms).
- Verified across the full viewport ladder + real iOS/Android; no zoom-disable.

## Related skills & agents
- **Agent:** `frontend-expert` / `react-tailwind-expert` (build the responsive UI),
  `ux-ui-reviewer` (validates mobile hierarchy + touch), `performance-reviewer` (mobile
  budgets/CWV), `master-orchestrator` (delivery gate).
- **Skills:** `project-context-builder` (stack detection — run first), `frontend-quality-flow`
  (the full state/a11y/console pass after responsiveness), `react-typescript-tailwind`
  (Tailwind breakpoint + container-query implementation), `ux-review-checklist` (scored
  review), `frontend-design` / `ui-ux-pro-max` (mobile aesthetic direction),
  `web-design-guidelines` (responsive + a11y compliance).
