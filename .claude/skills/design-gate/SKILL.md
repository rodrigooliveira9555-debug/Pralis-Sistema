---
name: design-gate
description: The Design Gate procedure — the hard pass/fail checkpoint a UI must clear BEFORE
  it proceeds to motion, polish, and delivery. Owners creative-director (authorial identity,
  hierarchy, not-template, not-AI) + design-system-guardian (token consistency, no magic
  numbers, dark-mode integrity). Runs the authorship + token checklist, produces a
  GREEN / YELLOW / RED verdict, and states exactly what BLOCKS vs what WARNS. Use when Marco
  says "isso tá pronto pra seguir?", "passa no design?", "tá autoral?", "tá usando os
  tokens?", "libera essa tela", "review de design antes de codar mais", "tá com cara de
  template/IA?".
---

# Design Gate (procedure + verdict)

## Purpose / When to use
The Design Gate is the **hard checkpoint that a UI must pass before it advances** to motion
work, final polish, and the Final Delivery Gate. It is not a vibe check — it is a named gate
in the IADOMARCO **Gate System**, with two owners, an explicit checklist, and a
**GREEN / YELLOW / RED verdict**. The `master-orchestrator` aggregates it into the Final
Delivery Gate and **never ships with a RED**.

The gate answers one question with two halves:

- **Authorship half — owner `creative-director`:** Does this UI have an authorial identity?
  A concept, a signature element, real visual hierarchy, and is it *not* generic /
  *not* template-like / *not* "AI-made"?
- **System half — owner `design-system-guardian`:** Is it built on the design tokens?
  Consistent color/space/radius/type/shadow/motion, no magic numbers, dark-mode integrity,
  no drift from the Tailwind config as single source of truth?

**Both halves must pass for GREEN.** A gorgeous screen full of hard-coded `#7c3aed` and
`p-[13px]` fails the system half; a perfectly tokenized screen with no point of view fails
the authorship half. The gate refuses both.

Why a gate and not just a review: a review produces opinions; a gate produces a *decision*.
Downstream work (motion, accessibility, performance, build) is expensive to redo. The Design
Gate stops a generic or untokenized screen *before* that investment, when fixing it is cheap.

Use it:
- After a screen is built/restyled, before it goes to `motion-director` / final polish.
- When Marco asks "passa no design?", "tá autoral?", "libera essa tela?".
- As the design checkpoint in the 360° review the orchestrator runs before delivery.

**Como pedir (PT-BR):** "Roda o design gate nessa tela", "isso passa no design ou tá
genérico?", "tá usando os tokens certinho?", "pode seguir pra animação?".

## Inputs you need
- The screen/route + file, and how to run it (`npm run dev`). Gate what renders.
- The **brand contract** — read `~/.claude/DESIGN_SYSTEM.md` and `~/.claude/UX_RULES.md`:
  violet `#905af0`, bg `#0f0f12`, radii 24/16/14, glass surfaces, soft shadows only, premium
  SaaS aesthetic, "never bootstrap / generic admin / old ERP". This is the source of truth
  the gate checks against.
- The **token source** — the project's `tailwind.config.*` (and any `theme`/CSS variables).
  The system half checks that the screen uses *these*, not ad-hoc values.
- The **creative direction brief** if one exists (from `creative-director`): the intended
  concept, signature element, palette, and type pairing. The gate verifies the build matches
  the brief.
- The reference bar: Stripe, Linear, Vercel, Raycast, Notion, Arc — "would this sit beside
  those?" is the GREEN question for the authorship half.

## Numbered Flow (stack-aware)
1. **Detect the stack** via `project-context-builder` (React+Vite vs Next.js) so the
   token-source check and fix instructions name the right files.
2. **Read the brand contract + brief.** Write the intended concept and signature element in
   one line. If neither the brief nor the screen has a concept, the authorship half is
   already failing.
3. **Run the screen** mobile + desktop, light and dark. Record the honest first impression.
4. **Run the Authorship checklist** (`creative-director`). This pulls in the
   `visual-innovation-checklist` originality score (/40) as evidence — a RED there is a RED
   on this half.
5. **Run the Token-Consistency checklist** (`design-system-guardian`). Grep the screen for
   magic numbers and hard-coded colors; verify dark-mode parity.
6. **Assign each half a verdict** (GREEN/YELLOW/RED) against the blocking criteria below.
7. **Combine** into the Design Gate verdict (the worse of the two halves governs, with the
   combination rules below).
8. **Produce the gate report** — owner per half, verdict per half, blocking findings, warns,
   and the combined verdict. One screen, scannable.
9. **Route:** RED → back to `creative-director` (authorship) and/or `design-system-guardian`
   (tokens) with the specific fixes; GREEN/YELLOW → forward to `motion-director`,
   `ux-ui-reviewer`, `accessibility-director`, then the orchestrator's Final Delivery Gate.

## Authorship checklist (owner: creative-director)
- [ ] **Concept exists** — the screen expresses a nameable idea/emotion, not default arrangement.
- [ ] **Signature element present** — one distinctive, *appropriate* thing a generator
      wouldn't produce (custom nav, considered empty state, branded data viz, a layout move).
- [ ] **Real visual hierarchy** — a clear focal point; the primary action wins; not everything
      `text-base` at equal weight.
- [ ] **NOT template** — not the centered-hero-+-three-equal-cards skeleton; not unmodified
      shadcn/Bootstrap/MUI defaults.
- [ ] **NOT AI-made** — passes the `visual-innovation-checklist` tells (no aurora blob filler,
      no Inter-everywhere, no borders-on-everything, no uniform radius/shadow).
- [ ] **Matches the creative brief** — concept, palette, type pairing, and signature element
      align with what `creative-director` specified (if a brief exists).
- [ ] **Typographic identity** — a real scale and considered pairing; type carries voice.
- [ ] **Color authorship** — brand accent rationed, not flat-filled; depth via surfaces.
- [ ] **Originality score** — `visual-innovation-checklist` ≥ 22 (not RED) attached as evidence.

## Token-Consistency checklist (owner: design-system-guardian)
- [ ] **Color tokens** — uses theme colors (`bg-background`, `text-foreground`, brand tokens),
      not hard-coded hex (`#905af0`, `#0f0f12`) sprinkled in `className`/`style`.
- [ ] **Spacing tokens** — uses the spacing scale (`p-4`, `gap-6`); no `p-[13px]` / `mt-[7px]`
      magic numbers off the 8px (or project) system.
- [ ] **Radius tokens** — uses the system radii (24/16/14 → `rounded-2xl`/`rounded-xl`/etc.),
      not arbitrary `rounded-[11px]`.
- [ ] **Type tokens** — uses the type scale/variants, not one-off `text-[15px]`.
- [ ] **Shadow/elevation tokens** — uses the defined soft-shadow steps, not ad-hoc box-shadows;
      no harsh default shadows.
- [ ] **Motion tokens** — durations/easings reference the motion scale (feeds the Motion Gate),
      not arbitrary `duration-[230ms]`.
- [ ] **Single source of truth** — new values were added to `tailwind.config.*` / theme, not
      inlined; no parallel/duplicate definitions.
- [ ] **Dark-mode integrity** — every surface/text/border has a correct dark counterpart;
      nothing hard-coded light; contrast holds in both themes.
- [ ] **Component API consistency** — variants/sizes go through the component's props (CVA),
      not one-off overrides; no drift between two instances of the same component.
- [ ] **No magic numbers anywhere** — a grep for `[\d+px]` / raw hex in the screen comes back
      clean (or each exception is justified and ticketed).

## How to run it (the mechanics)
- **Grep for drift** (stack-aware path) to back the token half with evidence:
  - hard-coded hex: `Grep` for `#[0-9a-fA-F]{3,8}` in the screen's `.tsx`.
  - magic numbers: `Grep` for `\[\d+px\]` (arbitrary Tailwind values).
  - inline styles: `Grep` for `style=\{\{` (often where tokens get bypassed).
- **Toggle dark/light** and re-check every surface; dark-mode breakage is a common RED.
- **Attach the originality score** from `visual-innovation-checklist` — don't re-derive it;
  reuse its number and verdict as the authorship-half evidence.

## Verdict (Gate System vocabulary)
Each half gets GREEN/YELLOW/RED; the **Design Gate verdict is governed by the worse half**,
with this combination rule:

- **GREEN (proceed)** — **both halves GREEN.** Authorial identity present + signature element
  + real hierarchy + not-template/not-AI (originality ≥ 30), AND full token consistency with
  dark-mode integrity. The screen advances to motion/polish/a11y/perf.
- **YELLOW (proceed with required fixes)** — at least one half YELLOW, **none RED.** E.g. a
  nameable signature but a borderline originality score (22–29), or a couple of magic numbers
  / one dark-mode mismatch. The screen may advance **but the listed fixes must be applied
  before the Final Delivery Gate.** Warns, doesn't hard-block.
- **RED (blocks delivery)** — **either half RED.** Authorship RED = no signature element, no
  concept, reads as template/AI, or originality < 22. System RED = pervasive hard-coded
  colors/magic numbers, broken dark mode, or component drift. **Blocks.** Routes back to the
  responsible owner with specific fixes before the screen can re-enter the gate.

### What BLOCKS (RED) vs what WARNS (YELLOW)
- **BLOCKS:** no signature element at all · no concept/point of view · reads as the AI-landing
  skeleton · 4+ generic tells · originality score < 22 · dark mode broken (unreadable in a
  theme) · pervasive hard-coded brand colors / magic numbers · two instances of one component
  visibly inconsistent.
- **WARNS:** borderline originality (22–29) · a weak-but-present signature · a handful of
  magic numbers in one spot · one dark-mode surface slightly off · a single off-scale type
  size · accent slightly over-used. These don't stop progress but must be cleaned before final.

> The gate verdict is **reproducible**: every RED/YELLOW cites the exact failing checklist
> item and the exact line/value, so a second run lands the same.

## Full Checklist (gate procedure)
- [ ] Stack detected; brand contract + creative brief read; intended concept written.
- [ ] Screen run mobile + desktop, light + dark; first impression recorded.
- [ ] Authorship checklist completed (creative-director); each item pass/fail.
- [ ] `visual-innovation-checklist` originality score (/40) computed and attached.
- [ ] Token-Consistency checklist completed (design-system-guardian); each item pass/fail.
- [ ] Grep evidence gathered (hard-coded hex, magic numbers, inline styles).
- [ ] Dark-mode parity verified on every surface/text/border.
- [ ] Each half assigned GREEN/YELLOW/RED with cited failing items.
- [ ] Combined Design Gate verdict assigned per the combination rule.
- [ ] Gate report produced (owner + verdict per half, blocking findings, warns, combined).
- [ ] Routing decided (RED → owner with fixes; GREEN/YELLOW → motion/UX/a11y/perf → orchestrator).

## Security & Quality rules
- **The gate cannot be passed by beauty alone.** An authorial screen that hard-codes colors
  and breaks dark mode is RED — the system half is non-negotiable, because drift compounds
  across a codebase over years.
- **The gate cannot be passed by discipline alone.** A perfectly tokenized but generic screen
  is RED — IADOMARCO refuses personality-less UI.
- **No unsafe "premium" effects** — a signature that needs `dangerouslySetInnerHTML`,
  un-allow-listed remote assets, or layout-animating jank is flagged to `security-reviewer` /
  `performance-reviewer`, not waved through.
- **Accessibility is a separate gate but a hard dependency** — the Design Gate never approves
  a fix that would fail `accessibility-review` (e.g. an authorial low-contrast palette).
- **Verdicts are evidence-backed** — every RED/YELLOW cites the exact item + value/line.

## Real-world Example — running the Design Gate on a settings screen
Screen: a dark-theme account settings page. Left nav, a profile card, a form, a "danger
zone" section. Built fast from shadcn defaults.

**Authorship half (creative-director):**
- Concept: none stated; it's a default form page. ✗
- Signature element: none — plain shadcn `Card` + `Input`, default everything. ✗
- Hierarchy: weak — the "danger zone" looks identical to a normal section. ✗
- `visual-innovation-checklist` score: **14/40**, 4 tells (default shadcn, borders-on-
  everything, uniform radius/shadow, no motion). → RED evidence.
- **Authorship verdict: RED.**

**Token-Consistency half (design-system-guardian):**
- Grep `#[0-9a-fA-F]{3,8}`: finds `#ef4444` hard-coded on the danger button, `#0f0f12` inline
  on the page wrapper. ✗
- Grep `\[\d+px\]`: finds `p-[13px]` on the profile card, `gap-[7px]` in the form. ✗
- Dark mode: the profile card background is hard-coded light (`bg-white`) — unreadable in the
  dark theme. ✗ (this alone is a system RED)
- Component drift: two cards use different radii (`rounded-xl` vs `rounded-[10px]`). ✗
- **Token verdict: RED.**

**Combined Design Gate verdict: RED — blocks delivery.** Both halves RED.

**Routing + fixes:**
- *Authorship → `creative-director`:* give the page a concept ("calm, safe control of your
  account"); add a signature treatment for the danger zone (distinct surface + restrained red
  accent + clear hierarchy); replace default cards with brand glass surfaces; build a real
  heading scale so sections rank.
- *System → `design-system-guardian`:* replace `#ef4444` with the `destructive` token,
  `#0f0f12`/`bg-white` with `bg-background`/`bg-card` (dark-correct); `p-[13px]`→`p-3`/`p-4`,
  `gap-[7px]`→`gap-2`; unify card radius to `rounded-2xl` (24); add any genuinely new value to
  `tailwind.config.*`, not inline.

**Re-run after fixes:** originality ~30/40, 0–1 tells, signature danger-zone treatment, full
token usage, dark-mode parity restored → both halves GREEN → **Design Gate GREEN.** Advances
to `motion-director`, then `accessibility-director`, then the Final Delivery Gate.

## Done criteria
- Both halves run with cited pass/fail per item; each half has a GREEN/YELLOW/RED verdict.
- Originality score attached as authorship evidence; grep evidence attached for tokens.
- Combined Design Gate verdict assigned per the combination rule.
- A one-screen gate report exists (owner + verdict per half, blocking findings, warns).
- Routing decided; on RED, specific fixes handed to the responsible owner(s).
- On GREEN/YELLOW, the screen is forwarded to the downstream gates.

## Related skills & agents
- **Agents:** `creative-director` (owns the authorship half + takes RED fixes),
  `design-system-guardian` (owns the token half + takes RED fixes), `motion-director` /
  `ux-ui-reviewer` / `accessibility-director` / `performance-reviewer` (downstream gates this
  feeds), `master-orchestrator` (aggregates into the Final Delivery Gate; blocks on any RED).
- **Skills:** `visual-innovation-checklist` (the originality score this gate consumes),
  `ux-review-checklist` (the broader craft rubric run alongside), `accessibility-review`
  (the a11y gate every fix must respect), `final-delivery-gate` (where this verdict rolls up),
  `project-context-builder` (stack/token-source detection — run first), `frontend-design` /
  `premium-saas-design` / `design-principles` (direction when authorship is RED),
  `react-typescript-tailwind` (token-disciplined implementation of the fixes).
