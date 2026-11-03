---
name: accessibility-review
description: WCAG 2.2 AA audit flow with an EXTREMELY complete checklist — contrast, focus
  order and visible focus, full keyboard operability, ARIA/landmarks/semantic HTML, target
  sizes, reduced-motion, forms/labels/errors, screen-reader narration, and color-independence
  — producing a GREEN / YELLOW / RED verdict that owns the Accessibility Gate. Mirrors the
  accessibility-director agent and reuses web-design-guidelines by reference. Use when Marco
  says "checa acessibilidade", "tá acessível?", "passa no WCAG?", "funciona no teclado?",
  "leitor de tela", "contraste tá ok?", "auditar a11y dessa tela/form/modal".
---

# Accessibility Review (WCAG 2.2 AA audit + verdict)

## Purpose / When to use
This is the operational playbook of the `accessibility-director` agent and the owner of the
**Accessibility Gate** in the IADOMARCO Gate System. It turns "tá acessível?" into a
**WCAG 2.2 AA audit** with a complete checklist and a **GREEN / YELLOW / RED verdict**.

Accessibility is **not a craft dimension you can average away**. A reference-grade,
beautiful screen with a focus-ring suppressed globally or a contrast failure is **RED** —
it does not ship. The Accessibility Gate folds into the UX Gate and the Final Delivery Gate
but keeps its **own owner and its own verdict**, because a11y is a legal/ethical floor, not a
nice-to-have, and because `master-orchestrator` **never ships with any RED**.

Why WCAG 2.2 specifically: it adds AA criteria that older audits miss and that hit real
products — **Focus Not Obscured (2.4.11)**, **Target Size minimum 24×24 (2.5.8)**,
**Dragging Movements alternatives (2.5.7)**, **Consistent Help (3.2.6)**, and **Accessible
Authentication (3.3.8)** (no cognitive-test-only logins). This skill audits against the
current bar, not 2.1.

This skill reuses `web-design-guidelines` **by reference** for the general UI-compliance
lens; here we go deeper specifically on the WCAG 2.2 AA gate and its verdict.

Use it:
- After any UI is built/changed, before it passes the UX Gate / Final Delivery Gate.
- When Marco asks "tá acessível?", "funciona no teclado?", "passa no WCAG?".
- On the highest-risk surfaces first: **forms, modals/dialogs, menus, tables, custom widgets.**

**Como pedir (PT-BR):** "Audita a acessibilidade dessa tela", "isso funciona só no teclado?",
"o contraste passa?", "o leitor de tela entende esse form?".

## Inputs you need
- The screen/route + file, how to run it (`npm run dev`), and the primary task on it.
- Marco's design contract — read `~/.claude/DESIGN_SYSTEM.md` / `~/.claude/UX_RULES.md`:
  dark `#0f0f12`, violet `#905af0`. Contrast is judged against the *real* token colors, so you
  must know them (e.g. helper text token vs background).
- Tooling: **axe DevTools / Lighthouse** for automated coverage, a **contrast checker** for
  measured ratios, and — non-negotiable — **a keyboard and a screen reader** (NVDA/JAWS on
  Windows, VoiceOver on macOS) for the manual pass automated tools can't do.
- Reality check: automated tools catch ~30–40% of issues. **The verdict is decided by the
  manual keyboard + screen-reader pass**, not by a green Lighthouse score.

## Numbered Flow (stack-aware)
1. **Detect the stack** via `project-context-builder` (React+Vite vs Next.js) so fixes name
   the right files (e.g. Next's `<Link>` vs `<a>`, RSC/`'use client'` for interactive widgets).
2. **Read the design contract** and record the real token colors you'll measure contrast
   against, plus the primary task on the screen.
3. **Automated sweep** — run axe + Lighthouse. Log violations, but treat this as *coverage*,
   not the verdict. Triage each: real issue vs false positive.
4. **Keyboard-only pass** — unplug the mouse. Tab through everything: order, visible focus,
   traps, operability, focus restoration after dialogs.
5. **Screen-reader pass** — navigate by landmarks, headings, and forms. Listen to whether the
   narration makes sense and whether state changes are announced.
6. **Measured contrast pass** — sample real text/UI colors; compute ratios; don't eyeball.
7. **Run the full checklist** below (the nine areas), logging each failure with the WCAG SC.
8. **Assign the verdict** GREEN/YELLOW/RED per the rules, ranking findings by severity.
9. **Prescribe fixes with code** for each failure, then route: fixes to `frontend-expert` /
   `react-typescript-tailwind`, verdict up to the UX Gate and the Final Delivery Gate.

## EXTREMELY complete checklist (WCAG 2.2 AA — nine areas)

### 1. Contrast & visual (1.4.3 / 1.4.11 / 1.4.1)
- [ ] Body text contrast ≥ **4.5:1**; large text (≥24px or ≥19px bold) ≥ **3:1** — measured.
- [ ] UI components & graphical objects (icons, input borders, focus ring, chart strokes)
      ≥ **3:1** against adjacent colors (1.4.11).
- [ ] Placeholder text is not the only label and still meets contrast if shown.
- [ ] Disabled controls are *understood* — but don't rely on them for required info.
- [ ] **No information by color alone** (1.4.1): error states, statuses, graph series, and
      links carry a second cue (icon, text, underline, pattern).
- [ ] Text resizes to 200% without loss of content/function; reflow at 320px (1.4.10/1.4.4).

### 2. Focus order & visible focus (2.4.3 / 2.4.7 / 2.4.11 / 2.4.12)
- [ ] **Every** interactive element shows a visible `:focus-visible` indicator (never
      `outline: none` with no replacement) with ≥ 3:1 contrast (2.4.7 / 2.4.13).
- [ ] Tab order is logical and matches the visual/reading order (2.4.3); no positive
      `tabindex` hacks.
- [ ] **Focus is not obscured** by sticky headers/footers/cookie bars when reaching it (2.4.11).
- [ ] Focus is never trapped except intentionally in a modal (and that trap is escapable).
- [ ] Focus is **restored** to the trigger after a dialog/menu closes.

### 3. Keyboard operability (2.1.1 / 2.1.2 / 2.5.7)
- [ ] Everything operable by mouse is operable by **keyboard alone** (2.1.1).
- [ ] No keyboard trap — you can always Tab/Shift+Tab away (2.1.2).
- [ ] Custom widgets implement the expected keys (Enter/Space activate; Arrows in
      menus/tabs/listbox; Esc closes; Home/End where relevant) per the ARIA Authoring Practices.
- [ ] **Dragging has a non-drag alternative** (2.5.7) — reorder/slider also works via buttons/keys.
- [ ] No timing that can't be extended/paused (2.2.1) unless essential.

### 4. ARIA, landmarks & semantics (1.3.1 / 4.1.2 / 2.4.1)
- [ ] **Native HTML first** — real `<button>`, `<a href>`, `<input>`, `<nav>`, `<main>`,
      `<header>`, `<footer>`; ARIA only where native won't do. (No ARIA is better than bad ARIA.)
- [ ] Landmarks present: one `<main>`, `<nav>`, `<header>`, `<footer>`; a **skip-to-content**
      link (2.4.1).
- [ ] Exactly **one `<h1>`**; heading levels sequential, no skips (1.3.1).
- [ ] Custom widgets have correct `role` + required states (`aria-expanded`, `aria-selected`,
      `aria-checked`, `aria-current`) kept in sync with reality (4.1.2).
- [ ] Icon-only controls have an accessible name (`aria-label` / visually-hidden text).
- [ ] Decorative images `alt=""`; meaningful images have descriptive `alt`.
- [ ] No `role`/`aria-*` that contradicts the element or duplicates native semantics.

### 5. Target sizes (2.5.8)
- [ ] Interactive targets ≥ **24×24 CSS px** (WCAG 2.2 AA minimum), or have ≥ 24px spacing
      between them. Prefer the practical **44×44** for touch where space allows.
- [ ] Inline-link exceptions understood; icon buttons padded to size, not just the glyph.

### 6. Motion & reduced-motion (2.3.3 / 2.2.2)
- [ ] `@media (prefers-reduced-motion: reduce)` honored — non-essential animation removed/
      reduced (2.3.3).
- [ ] No animation that can trigger seizures (no >3 flashes/sec) (2.3.1).
- [ ] Auto-playing/looping motion > 5s can be paused/stopped/hidden (2.2.2).
- [ ] Parallax/auto-carousels have controls and respect reduced-motion.

### 7. Forms, labels & errors (1.3.1 / 3.3.1 / 3.3.2 / 3.3.3 / 4.1.3 / 3.3.8)
- [ ] Every input has a programmatic **`<label>`** (or `aria-labelledby`) — not just a
      placeholder; clicking the label focuses the input.
- [ ] Required fields marked in text/ARIA (`aria-required`), not color/asterisk alone (3.3.2).
- [ ] Errors are **identified in text**, linked to the field via `aria-describedby`, and the
      field marked `aria-invalid` (3.3.1).
- [ ] Error/status messages announced via a **live region** (`role="alert"` / `aria-live`) (4.1.3).
- [ ] Helpful suggestions provided on error where known (3.3.3).
- [ ] Inputs use correct `type`/`autocomplete`/`inputmode` (1.3.5) for the data.
- [ ] **Accessible Authentication (3.3.8)** — login doesn't depend on a cognitive test only
      (allow paste, password managers, alternatives to puzzles).
- [ ] Related controls grouped (`<fieldset>`/`<legend>` for radio/checkbox groups).

### 8. Screen-reader narration (the manual listen)
- [ ] Tab from top: landmark/region announcements make sense and orient the user.
- [ ] Each control announces **name + role + state** ("Salvar, button"; "Notificações, switch,
      on").
- [ ] Dynamic changes (loading, success, validation, route change) are announced, not silent.
- [ ] No reading of hidden/`display:none` content; no duplicated/garbled labels.
- [ ] Reading order matches visual order; no "mystery meat" (unnamed buttons/links).
- [ ] Tables have `<th>` with `scope`; data relationships are conveyed.

### 9. Color-independence & content (1.4.1 / 1.1.1 / 3.1.2)
- [ ] Status/validation/links/chart series distinguishable without color (icon/text/pattern).
- [ ] Language of page (`<html lang>`) and of any inline foreign passages set (3.1.1/3.1.2).
- [ ] Link text is meaningful out of context (no "clique aqui" / "saiba mais" alone) (2.4.4).
- [ ] Non-text content has text alternatives (1.1.1).

## Verdict (Gate System vocabulary — owns the Accessibility Gate)
- **GREEN (passes the gate)** — zero AA failures across all nine areas: measured contrast
  passes, full keyboard operability with visible focus, semantics/landmarks correct, forms
  labelled with announced errors, reduced-motion honored, no color-only info, screen-reader
  narration coherent. The screen advances.
- **YELLOW (proceed with required fixes)** — **no blocking failures**, but minor or
  non-blocking issues remain: a single non-critical target slightly under 24px with adequate
  spacing, a redundant ARIA attribute, a missing `lang` on a sub-passage, a link label that's
  weak but not unusable. **Advances, but the fixes are required before the Final Delivery
  Gate.** Warns, doesn't hard-block.
- **RED (blocks delivery)** — **any** of: a contrast failure on real content; a control not
  keyboard-operable; a keyboard trap; suppressed/invisible focus; an unlabeled form input; an
  error not programmatically associated/announced; a modal without focus management; info
  conveyed by color alone on a critical state; a screen-reader-unnameable interactive control.
  **Blocks.** A beautiful screen with any of these does **not** ship.

> One RED caps the whole screen at "not shippable" regardless of craft or originality score —
> a11y is not traded against beauty.

## How to run it (mechanics)
- `Grep` for red flags fast: `outline:\s*none` / `outline-none` (suppressed focus),
  `onClick` on `<div>`/`<span>` (non-semantic controls), `placeholder=` without a sibling
  `<label>` / `htmlFor`, `aria-` typos, `<img` without `alt`.
- Keyboard pass: Tab / Shift+Tab / Enter / Space / Arrows / Esc through every flow; watch the
  focus ring the whole way; open and close each modal/menu and confirm focus return.
- Screen reader: navigate by landmark, by heading, by form field; *listen*, don't read the DOM.
- Contrast: sample the actual rendered colors (real token values) and compute ratios.

## Real-world Example — auditing a "delete account" confirmation modal + form
Screen: a settings page with a "Excluir conta" button that opens a confirmation modal
containing an email-confirmation input and a red "Excluir" button. Dark theme.

**Findings (with WCAG SC):**
- **Focus suppressed (RED, 2.4.7):** global `*:focus { outline: none }` — nothing shows focus.
- **Modal focus not managed (RED, 2.1.2 / 2.4.3):** opening the modal leaves focus on the page
  behind; Tab walks *under* the overlay; Esc doesn't close; on close, focus is lost to `<body>`.
- **Input unlabeled (RED, 1.3.1 / 3.3.2):** the email field uses only a placeholder
  "Digite seu email"; no `<label>`; the screen reader announces "edit text" with no name.
- **Error not associated/announced (RED, 3.3.1 / 4.1.3):** wrong email shows a red span,
  but it's not linked via `aria-describedby`, the input isn't `aria-invalid`, and nothing is
  announced — a screen-reader user doesn't know it failed.
- **Color-only danger (RED, 1.4.1):** the destructive button is distinguished from cancel by
  red alone; helper text `#8a8a8a` on `#0f0f12` = **3.8:1** (fails 4.5:1).
- **Target size (YELLOW, 2.5.8):** the modal's "X" close glyph is 20×20 with tight padding.

**Verdict: RED — blocks delivery.** Multiple blocking failures.

**Fixes (code):**
```tsx
// Restore visible focus globally (token-driven ring), not outline:none.
// globals.css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--ring, #905af0);
  outline-offset: 2px;
}

// Accessible, focus-managed modal (Radix Dialog handles trap + Esc + focus return).
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/60" />
    <Dialog.Content
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6"
      aria-describedby="del-desc"
    >
      <Dialog.Title>Excluir conta</Dialog.Title>
      <p id="del-desc">Esta ação é permanente. Confirme seu email para continuar.</p>

      <label htmlFor="confirm-email" className="block text-sm">Email da conta</label>
      <input
        id="confirm-email"
        type="email"
        autoComplete="email"
        aria-required="true"
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? "confirm-email-error" : undefined}
        className="min-h-11 ..."   /* ≥44px target */
      />
      {hasError && (
        <p id="confirm-email-error" role="alert" className="text-destructive">
          {/* icon + text: not color alone */}
          <WarningIcon aria-hidden="true" /> Email não confere.
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <Dialog.Close className="min-h-11 px-4">Cancelar</Dialog.Close>
        <button className="min-h-11 px-4 bg-destructive text-destructive-foreground">
          <TrashIcon aria-hidden="true" /> Excluir conta {/* icon + text, not red alone */}
        </button>
      </div>

      <Dialog.Close aria-label="Fechar" className="absolute right-3 top-3 grid h-11 w-11 place-items-center">
        <XIcon aria-hidden="true" />
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```
Plus: helper text token → `#b4b4c7` (≈7:1, passes); destructive distinguished by icon+label,
not color. **Re-audit:** all nine areas pass → **GREEN.** Handed to the UX Gate and the Final
Delivery Gate.

## Security & Quality rules
- **A11y is a hard gate, never a tradeable dimension** — one RED = not shippable, period.
- **Don't bolt ARIA onto unsafe markup** — prefer native semantics; bad ARIA is worse than none.
- **Live regions for async state** — loading/error/success must be announced; silent UI fails
  screen-reader users even when it "works".
- **Reduced-motion is mandatory** — any motion that ignores `prefers-reduced-motion` is a finding
  (coordinate with the Motion Gate).
- **Findings cite the WCAG SC** so they're defensible and reproducible across reviewers.
- **PII/destructive flows** (like delete-account) must stay accessible *and* confirmable —
  loop `security-reviewer` if an a11y fix changes a destructive flow's safeguards.

## Done criteria
- All nine checklist areas audited; each failure logged with its WCAG 2.2 SC.
- Automated sweep + manual keyboard pass + screen-reader pass + measured contrast all done.
- Findings ranked Critical / High / Medium / Low; each has a concrete (code) fix.
- A clear GREEN / YELLOW / RED verdict assigned per the rules (any blocking issue ⇒ RED).
- Handoffs named (`frontend-expert` / `react-typescript-tailwind` to fix; UX + Final gates).

## Related skills & agents
- **Agents:** `accessibility-director` (owns this gate; this is its playbook), `ux-ui-reviewer`
  (UX Gate this folds into), `frontend-expert` / `react-tailwind-expert` (implement fixes),
  `master-orchestrator` (Final Delivery Gate; blocks on any RED), `security-reviewer` (when
  a11y fixes touch auth/destructive flows).
- **Skills:** `web-design-guidelines` (general UI-compliance lens reused by reference),
  `ux-review-checklist` (broader craft scoring with its own a11y pass), `design-gate` /
  `visual-innovation-checklist` (design gates whose fixes must respect this audit),
  `frontend-quality-flow` (the interaction-state + a11y hardening pass), `mobile-first-ui`
  (touch target sizing), `project-context-builder` (stack detection — run first),
  `final-delivery-gate` (where this verdict rolls up).
