---
name: build-and-test-checklist
description: Build / typecheck / lint / test release gate. Mirrors the qa-build-fixer agent.
  Use when Marco says "ta dando erro no build", "nao compila", "roda os testes", "antes de
  subir", "ci falhou", "ta vermelho", or before any merge/deploy. Runs the real stack-aware
  commands (npm run build, npx tsc --noEmit, npm run lint, vitest/jest, playwright), turns a
  red build green, and enforces the test pyramid, flake control, and a hard release gate.
---

# build-and-test-checklist

## Purpose / When to use
This is the quality gate that stands between "it works on my machine" and "it's safe to ship".
It's run by someone acting as a Head of Quality, not a button-pusher: the job isn't only to
make the build pass — it's to make the *right* checks pass, fast and reliably, so a green
pipeline actually means the product works. A build that's green because tests were deleted or
types were silenced with `any` is worse than a red one: it lies.

Use it when:
- The build, typecheck, lint, or CI is red and needs to go green.
- You're about to merge a PR or deploy (this is the pre-merge / pre-deploy gate).
- You added a feature and need to confirm tests cover it at the right level.
- A test is flaky and the suite can't be trusted.

This skill is about *correctness and the gate*. Performance budgets live in
`performance-checklist`; security review in `security-checklist`. Run all three before deploy.

## Inputs you need
- The stack and its scripts — detect via the `project-context-builder` skill, then read the
  `scripts` block in `package.json` for the *real* command names (don't assume `npm run test`).
- The package manager from the lockfile: `package-lock.json` → npm, `pnpm-lock.yaml` → pnpm,
  `yarn.lock` → yarn, `bun.lockb` → bun. Use the matching runner.
- Current failure output (build/tsc/lint/test logs), full and untruncated.
- The CI config (`.github/workflows/*`, `vercel.json`) to mirror what the pipeline runs.
- Marco's global conventions — read `~/.claude/CLAUDE.md` / `~/.claude/STACK.md`.

## Numbered Flow
1. **Detect stack + commands.** Run the `project-context-builder` routine, then read
   `package.json` scripts. Establish the four core commands for THIS project. Typical defaults:
   - Build: `npm run build` (Vite/Next) — never assume; some use `tsc -b && vite build`.
   - Typecheck: `npx tsc --noEmit` (or `npm run typecheck` if defined).
   - Lint: `npm run lint` (ESLint) and `npm run format:check` if present.
   - Unit/integration tests: `npx vitest run` or `npx jest` (whichever is configured).
   - E2E: `npx playwright test` or `npx cypress run` if present.
   Match the package manager (`pnpm`/`yarn`/`bun`) from the lockfile.
2. **Run the gate in cheap-to-expensive order** and fix at the first failing layer before moving
   on: typecheck → lint → unit/integration → build → E2E. A type error masks everything
   downstream, so fixing it first saves time.
3. **For a red build, read the FIRST error, not the last.** Build tools cascade; the first error
   is usually the cause and the rest are noise. Fix it, re-run, repeat. Don't fix symptoms in
   reverse order.
4. **Fix the cause, not the gate.** Resolve type/lint/test failures properly. Forbidden
   "fixes": deleting the failing test, `// @ts-ignore`, `any`, `eslint-disable` blanket lines,
   `test.skip`, or lowering coverage thresholds to pass. Each of those turns a real signal off.
5. **Check coverage at the right level (test pyramid).** Most coverage in fast unit tests, fewer
   integration tests, a thin layer of E2E for critical user journeys. Don't push everything to
   slow, flaky E2E. New logic needs a test; new critical flow needs one E2E.
6. **Hunt and quarantine flakes.** A test that passes/fails non-deterministically is a liability
   — it trains people to ignore red. Find the cause (timing, shared state, real network, ordering)
   and fix it. Only quarantine (mark + ticket) as a last resort, never ignore.
7. **Mirror CI locally.** Run what the pipeline runs so "green locally" means "green in CI".
   Clean install (`npm ci`) catches lockfile/peer-dep drift that a warm `node_modules` hides.
8. **Confirm the release gate is fully green** — all four/five layers — then hand off to deploy.

## Full Checklist

### Setup & detection
- [ ] Detected stack via `project-context-builder`; read `package.json` scripts for real names.
- [ ] Identified the package manager from the lockfile and used the matching runner.
- [ ] Read CI config so local runs mirror the pipeline.

### Typecheck (TypeScript projects)
- [ ] `npx tsc --noEmit` (or project's typecheck script) passes with zero errors.
- [ ] No new `any`, `as any`, `// @ts-ignore`, or `// @ts-expect-error` added to silence errors.
- [ ] `strict` mode is on (or kept on) — no loosening of `tsconfig` to pass.
- [ ] Public function signatures and component props are typed (no implicit `any`).

### Lint & format
- [ ] `npm run lint` passes; no new warnings introduced.
- [ ] No blanket `eslint-disable` added to bypass a real rule (scoped, justified disables only).
- [ ] Formatter check passes (`prettier --check` / `npm run format:check`) if configured.
- [ ] No leftover `console.log`, `debugger`, `.only`, or commented-out dead code.

### Unit & integration tests
- [ ] `npx vitest run` / `npx jest` passes; zero failing, zero unexpected skips.
- [ ] New logic has unit tests covering happy path + edge cases (empty/null/error/boundary).
- [ ] Tests assert behavior/outputs, not implementation details (resilient to refactor).
- [ ] No real network/DB/clock in unit tests — mocked/faked deterministically.
- [ ] Test pyramid respected: most coverage in fast unit tests, fewer integration, thin E2E.
- [ ] Coverage thresholds met and NOT lowered to pass.

### Build
- [ ] `npm run build` succeeds with zero errors.
- [ ] No new build warnings ignored (especially "cannot resolve", chunk-size, env-var warnings).
- [ ] Production build, not just dev server, verified.
- [ ] Build output runs (`npm run preview` for Vite / `next start`) without runtime crash.

### E2E (if configured)
- [ ] `npx playwright test` / `npx cypress run` passes for critical journeys (login, core flow).
- [ ] E2E tests use stable selectors (`data-testid`/roles), not brittle CSS/text.
- [ ] Proper waits (auto-waiting / `await expect`) — no arbitrary `sleep`/`waitForTimeout` hacks.

### Flake control
- [ ] No test depends on order, shared mutable state, real time, or live external services.
- [ ] Suspected flaky tests run multiple times to confirm determinism.
- [ ] Any unavoidable flake is quarantined WITH a tracking note, never silently ignored.

### Clean-room & CI parity
- [ ] `npm ci` (clean install) succeeds — lockfile and peer deps are consistent.
- [ ] The exact CI command sequence passes locally.
- [ ] No env var the build/tests need is missing (and none are secrets hardcoded for tests).

### Forbidden "fixes" to refuse (these turn signal off)
- [ ] No deleted/`skip`ped test to make the suite green.
- [ ] No `any` / `as any` / `@ts-ignore` / `@ts-expect-error` added to pass typecheck.
- [ ] No blanket `eslint-disable` or rule turned off in config to pass lint.
- [ ] No coverage threshold lowered to pass.
- [ ] No `.only` left in (it silently skips every other test in the file).

### Release gate (final)
- [ ] Typecheck ✅  Lint ✅  Unit/Integration ✅  Build ✅  E2E ✅ (where applicable).
- [ ] No `skip`/`only`/`ignore`/coverage-lowering left in the diff.
- [ ] Ready to hand off to `deployment-checklist`.

## Security & Quality rules
- **Green for the right reason.** A passing gate must reflect working code, not silenced checks.
  Deleting tests, `any`, `@ts-ignore`, blanket `eslint-disable`, `test.skip`, or lowering
  coverage to pass are all forbidden "fixes" — they remove signal.
- **Fail the gate on any red layer.** No merge/deploy with a failing typecheck, lint, test, or
  build. The gate is binary.
- **Determinism is a feature.** Tests must not depend on time, order, network, or shared state.
  A flaky suite is a broken suite.
- **Tests are real code.** They get reviewed, named clearly, and assert behavior — not snapshots
  of implementation that break on every refactor.
- **No secrets in tests or fixtures**; use env/test doubles. Re-check via `security-checklist` if
  a change touches auth or data access.

## Real-world Example — turning a red build green (Pralis Conduta, Vite + TS)
**Report:** "O build ta vermelho, nao sobe pra Vercel." CI log ended with dozens of errors.

1. **Detect.** `package.json`: `"build": "tsc -b && vite build"`, `"lint": "eslint ."`,
   `"test": "vitest run"`. Lockfile = `package-lock.json` → npm. So the build runs typecheck
   first, which is why one type error aborts the whole build.
2. **Read the FIRST error**, not the wall of red:
   ```
   src/lib/storage.ts:42:18 - error TS2345: Argument of type 'string | null' is not
   assignable to parameter of type 'string'.
   ```
   Every error after it was a cascade from this module failing to type.
3. **Root cause.** `localStorage.getItem("user")` returns `string | null`, and the code passed
   it straight into `JSON.parse(...)` typed as `string`. The "right" fix is to handle null —
   NOT to cast with `as string` (which would crash at runtime on first load).
4. **Fix the cause:**
   ```ts
   const raw = localStorage.getItem("user");
   const user = raw ? JSON.parse(raw) as User : null; // handle the null case explicitly
   ```
5. **Re-run the gate in order:** `npx tsc --noEmit` → clean. `npm run lint` → one unused import
   flagged, removed it (didn't `eslint-disable`). `npx vitest run` → green. `npm run build` →
   succeeds. `npm run preview` → app loads, login works.
6. **Regression guard.** Added a unit test for `storage.ts` covering the "no user in
   localStorage" case (returns `null`, doesn't throw) — the exact gap that broke the build.
7. **CI parity.** Ran `npm ci && npm run build` clean-room; matched CI. Gate fully green →
   handed off to `deployment-checklist`.

The wrong move would have been `as string` to make tsc shut up — green build, runtime crash on
first visit. The gate is only valuable if it's honest.

## Done criteria
- All gate layers pass: typecheck, lint, unit/integration, build, and E2E (where present).
- Failures were fixed at the root, with zero silenced checks (`any`/ignore/skip/coverage drop).
- New logic and critical flows have appropriate tests at the right pyramid level.
- The suite is deterministic; no known un-quarantined flake.
- A clean-room `npm ci` build matches CI.
- Ready to hand off to deployment.

## Related skills & agents
- Agent: `qa-build-fixer` (this checklist is its operating procedure).
- Skill: `javascript-testing-patterns` — unit/integration tests with Vitest/Jest/Testing Library.
- Skill: `e2e-testing-patterns` — reliable Playwright/Cypress journeys, flake control.
- Skill: `bug-fixing-flow` — when a test fails because of a real bug, fix it there first.
- Skill: `typescript-advanced-types` — resolving hard type errors without `any`.
- Skill: `performance-checklist` — budgets/bundle size after the build is green.
- Skill: `project-context-builder` — stack/script detection.
- Agent: `deployment-specialist` — runs `deployment-checklist` once the gate is green.
- Agent: `master-orchestrator` — owns the 360° gate and blocks delivery on a red build.

> Before choosing commands, read Marco's global files (`~/.claude/CLAUDE.md`,
> `~/.claude/STACK.md`) and detect the stack via `project-context-builder`.
