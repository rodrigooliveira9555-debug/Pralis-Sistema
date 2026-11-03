---
name: bug-fixing-flow
description: Systematic debugging flow — reproduce, isolate root cause, apply a minimal fix,
  add a regression test, and verify. Mirrors the bug-fixer agent. Use when Marco says
  "ta dando erro", "nao funciona", "quebrou", "bug", "tela branca", "deu pau", "as vezes
  falha", or pastes a stack trace / console error. Stops guess-and-check; finds the real
  cause before changing code. Stack-aware (React+Vite | Next.js | Expo | Node API | n8n).
---

# bug-fixing-flow

## Purpose / When to use
This is the disciplined method for fixing bugs the way a senior engineer does: you do NOT
change code until you can reproduce the failure and explain the root cause. The single most
expensive habit in debugging is "shotgun fixing" — editing things that look suspicious until
the symptom disappears, which usually hides the bug instead of fixing it and creates two new
ones. This skill exists to replace that with a repeatable loop: **Reproduce → Isolate →
Root-cause → Minimal fix → Regression test → Verify.**

Use it when:
- Something throws, crashes, renders blank, or returns wrong data.
- Behavior is intermittent ("as vezes falha") — flaky bugs need this MORE, not less.
- A stack trace or console/network error appears.
- A regression shows up ("funcionava antes") — perfect case for `git bisect`.
- An n8n workflow fails on a node or produces wrong output.

If the report is "it's slow" rather than "it's wrong/broken", that's the `performance-checklist`
skill, not this one. If the build/typecheck/tests are red, that's `build-and-test-checklist`.

## Inputs you need
- The exact symptom: what you saw vs. what you expected, with a concrete example.
- Repro steps: URL/screen, inputs, role/account, device/browser, and whether it's 100% or flaky.
- The full stack trace / console output / failing network response — not a paraphrase.
- Environment: dev vs. prod, which branch/commit, recent changes (`git log --oneline -20`).
- The stack — detect via the `project-context-builder` skill (decides tools and commands).
- For regressions: the last known-good commit (even approximate) for bisection.

## Numbered Flow
1. **Reproduce it reliably — this is non-negotiable.** A bug you can't reproduce is a bug you
   can't verify fixed. Pin down the exact inputs/state. For "intermittent" bugs, find the
   variable that flips it: timing, ordering, empty data, a specific account/role, cache state,
   timezone, network latency. Make a failing case you can run on demand. If you truly can't
   reproduce, add logging/telemetry around the suspected area and wait for the next occurrence
   — don't fix blind.
2. **Capture the evidence.** Read the FULL stack trace top-to-bottom. The first line is the
   error; the first frame *in your code* (not in node_modules) is usually where to look. Note
   the error type, message, file:line, and the call path. For async errors, check whether the
   trace is truncated and enable async stack traces.
3. **Form a hypothesis, then isolate.** State a specific, falsifiable hypothesis ("the API
   returns `null` for `user.profile` when the account is new, and the component dereferences
   it"). Then shrink the surface: comment out / bypass halves of the flow, add targeted logs,
   or write a tiny script that calls just the suspect function. Binary-search the failure.
4. **Use `git bisect` for regressions.** If it worked before, let git find the breaking commit:
   `git bisect start`, `git bisect bad`, `git bisect good <known-good>`, then test at each step.
   This finds the exact commit far faster than reading diffs.
5. **Confirm the root cause, not the symptom.** Ask "why" until you hit the actual defect.
   A blank screen (symptom) → an unhandled exception (proximate) → a `.map` on `undefined`
   (mechanism) → the API contract changed and the loader returns `undefined` on error
   (ROOT CAUSE). Fix the root, not the symptom. If you can't explain *why* your change fixes it,
   you haven't found the cause.
6. **Write the minimal fix.** Change the least code that addresses the root cause. Resist
   refactoring "while you're here" — that hides the fix in noise and adds risk. If a refactor
   is genuinely needed, do it as a separate, follow-up change.
7. **Add a regression test that fails before and passes after.** This is what stops the bug
   from coming back. Write the test, watch it fail on the old code (or mentally confirm it
   would), apply the fix, watch it pass. No regression test = the fix is not done.
8. **Verify end-to-end.** Re-run the original repro steps. Run the surrounding tests, typecheck,
   and lint (`build-and-test-checklist`). Check you didn't break adjacent behavior. For flaky
   bugs, run the case many times.
9. **Document the cause briefly** in the commit/PR: symptom, root cause, fix, and the test
   added. Future-you and Marco will thank you.

## Full Checklist

### Reproduce
- [ ] I can trigger the bug on demand with documented steps/inputs.
- [ ] I know if it's 100% reproducible or intermittent (and if flaky, what flips it).
- [ ] I reproduced it in the right environment (the prod-only bugs need prod-like data/config).
- [ ] I captured the full, untruncated stack trace / console / failing network response.
- [ ] I noted the affected role/account/device/browser/timezone where relevant.

### Isolate & root-cause
- [ ] I read the stack trace fully and located the first frame in my own code.
- [ ] I wrote a specific, falsifiable hypothesis before touching code.
- [ ] I narrowed the failure by binary search (bisect code path / logs / git bisect).
- [ ] For regressions, I ran `git bisect` to find the exact breaking commit.
- [ ] I can explain the ROOT cause in one sentence, distinct from the symptom.
- [ ] I checked for the same root cause elsewhere (is this one instance of a class of bug?).

### Common root-cause categories checked
- [ ] Null/undefined access on optional/empty data (new user, empty list, failed fetch).
- [ ] Off-by-one / boundary (first/last item, empty array, pagination edges).
- [ ] Async/race: state read before it's set, unawaited promise, stale closure in React.
- [ ] Type mismatch / API contract change (shape differs from what code assumes).
- [ ] Timezone / date parsing / locale.
- [ ] State management: stale cache, missing dependency in `useEffect`, key collisions.
- [ ] Environment/config difference (env var missing in prod, different DB row).
- [ ] Error swallowed by an empty `catch` hiding the real failure.

### Fix
- [ ] The fix addresses the root cause, not the symptom.
- [ ] It's the minimal change; no unrelated refactor smuggled in.
- [ ] Error handling fails closed and surfaces actionable info (see `error-handling-patterns`).
- [ ] No new `// @ts-ignore`, `any`, or empty `catch` introduced to silence the error.
- [ ] Edge cases around the fix are handled (empty, null, error, concurrent).

### Regression test & verify
- [ ] A test reproduces the bug and fails on the old code.
- [ ] The same test passes with the fix.
- [ ] Original manual repro steps now pass.
- [ ] Surrounding tests, `npx tsc --noEmit`, and lint are green.
- [ ] For flaky bugs, the case was run repeatedly without failing.
- [ ] Adjacent features were spot-checked for collateral damage.

### Anti-patterns to refuse (never do these)
- [ ] No "fix" that only hides the symptom (empty `catch`, broad `try`, optional-chaining the
      whole world) without explaining the cause.
- [ ] No change committed before the bug is reproduced.
- [ ] No "I think this is it" merge without a failing→passing regression test.
- [ ] No widening of types/permissions/RLS/CORS just to make the error go away.

### Document
- [ ] Commit/PR explains symptom → root cause → fix → test added.

## Security & Quality rules
- **Never paper over a bug.** Wrapping a crash in an empty `try/catch` to stop the error is not
  a fix — it converts a loud bug into a silent one. Fix the cause; handle the error meaningfully.
- **No fix without a reproduction and a regression test.** Both are required for "done".
- **Don't expand scope under the cover of a bug fix.** Refactors ride in a separate change.
- **Mind security while fixing:** a quick fix that disables validation, broadens an RLS policy,
  loosens CORS, or logs PII to debug is a regression. Re-check via `security-checklist` if your
  fix touches auth, data access, or input handling.
- **Reverse a too-clever fix cheaply:** prefer fixes that are easy to revert; keep them small.

## Real-world Example — the blank-screen bug on a new colaborador
**Symptom (Marco's report):** "Quando um colaborador novo faz login, a tela fica branca. Com
os antigos funciona." (Pralis Conduta — React + Vite + TS + Supabase.)

1. **Reproduce.** Created a brand-new colaborador, logged in → blank screen, 100% reproducible.
   Existing users worked. So the variable is "account has no prior progress data".
2. **Evidence.** Console showed: `TypeError: Cannot read properties of undefined (reading 'map')`
   with the first own-code frame at `src/app/pages/Module.tsx:64`.
3. **Hypothesis.** "For a new user, the progress query returns no row, the loader returns
   `undefined` for `progress.completedSteps`, and the component calls `.map` on it."
4. **Isolate.** Logged the loader output: `progress` was `undefined`, not `{ completedSteps: [] }`.
   Confirmed the Supabase query used `.single()`, which errors/returns null when there's no row.
5. **Root cause.** Not the `.map` line (symptom). The real defect: the data layer assumed every
   user already has a progress row, so it never handled the "no row yet" case. `.single()` on a
   missing row produced `null`, and the page rendered before guarding it.
6. **Minimal fix.** Use `.maybeSingle()` and default the shape at the boundary:
   ```ts
   const { data } = await supabase.from("progress").select("*").eq("user_id", uid).maybeSingle();
   const progress = data ?? { completedSteps: [] }; // normalize once, at the boundary
   ```
   (No refactor of the page — just the contract fix + a defensive default.)
7. **Regression test.** Added a test where the progress fetch returns `null` and asserted the
   module page renders the empty state instead of throwing. It failed on the old code, passed
   after.
8. **Verify.** New-user login now shows the first step; existing users unaffected; tsc + lint
   green; ran the new-user flow 10x.
9. **Document.** Commit: "fix(module): handle first-login users with no progress row — return
   `{completedSteps: []}` from loader; add regression test."

## Done criteria
- The bug is reproducible on demand and now fixed in the right environment.
- The root cause is identified and explained in one sentence (not the symptom).
- The fix is minimal and addresses the cause.
- A regression test fails before and passes after the fix.
- Typecheck, lint, and surrounding tests are green; original repro passes.
- The cause/fix/test is documented in the commit or PR.

## Related skills & agents
- Agent: `bug-fixer` (this flow is its operating procedure).
- Skill: `debugging-strategies` — profiling, tooling, and root-cause techniques in depth.
- Skill: `error-handling-patterns` — how to handle errors without hiding them.
- Skill: `build-and-test-checklist` — the verify gate (typecheck/lint/test).
- Skill: `git-advanced-workflows` — `git bisect`, reflog, recovering from bad states.
- Skill: `javascript-testing-patterns` — writing the regression test (Vitest/Jest/Testing Library).
- Skill: `project-context-builder` — stack detection for the right commands.
- Agent: `master-orchestrator` — routes bug reports here and gates on the regression test.

> Before choosing commands/conventions, read Marco's global files (`~/.claude/CLAUDE.md`,
> `~/.claude/STACK.md`) and detect the stack via `project-context-builder`.
