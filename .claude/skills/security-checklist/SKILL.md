---
name: security-checklist
description: AppSec review checklist for web/app/API code. Run before merging or shipping
  anything that touches auth, data, secrets, uploads, or external input. Mirrors the
  security-reviewer agent. Use when Marco says "revisa a seguranca", "isso ta seguro?",
  "antes de subir", "tem vazamento?", "checa o login/RLS", or before any deploy. Covers
  OWASP Top 10, API Top 10, Supabase RLS, secrets, IDOR/XSS/SQLi/SSRF/CSRF, supply chain,
  JWT, file uploads, and LGPD/PII handling. Produces a severity-ranked findings report.
---

# security-checklist

## Purpose / When to use
This is the operational checklist a senior AppSec reviewer runs before code reaches
production. It exists because the most expensive bugs are not crashes — they are silent
data leaks, broken access control, and leaked keys that stay exploitable for months. Marco
ships marketing apps, digital products, and automations where a single leaked `service_role`
key or a missing Row Level Security policy can expose every customer's data. This skill turns
a simple "isso ta seguro?" into a disciplined, threat-modeled review.

Use it when:
- Code touches authentication, authorization, sessions, or password/OTP flows.
- Code reads or writes user data, especially in Supabase / Postgres.
- You added a new API route, webhook, server action, or n8n workflow exposed to the internet.
- You handle file uploads, redirects, server-side fetches, or HTML/Markdown rendering.
- You're about to `git push`, open a PR, or deploy.
- Dependencies changed (`package.json` / lockfile diff).

Do NOT treat this as a one-time gate. Run the relevant sections on every change to the
surfaces above. Most breaches come from a "small" change to an already-reviewed area.

## Inputs you need
- The diff or the set of changed files (`git diff`, PR, or working tree).
- The stack — detect it first via the `project-context-builder` skill. RLS checks only apply
  if `supabase/` exists; CSRF token checks apply to cookie-session apps, not pure-Bearer APIs.
- Where secrets live: `.env`, `.env.local`, Vercel/host env vars, CI secrets.
- The data model: which tables hold PII, which columns are sensitive, who should read/write each.
- The threat surface: which routes are public, which require auth, which require a specific role.
- Marco's global files — read `~/.claude/CLAUDE.md` and `~/.claude/STACK.md` for conventions.

## Numbered Flow
1. **Detect the stack and threat surface.** Run the `project-context-builder` routine to
   classify the project (React+Vite | Next.js | Expo | Node API | n8n | static). This decides
   *which* checklist sections apply. A static site has no RLS; a Next.js app has server actions
   and middleware; a Node API has its own authz layer. Never run the whole list blindly.
2. **Map trust boundaries.** Draw the line between untrusted input (client, query params,
   headers, webhook bodies, uploaded files, third-party APIs) and trusted server logic. Every
   place input crosses that line is a review point. List them explicitly before reviewing.
3. **Threat-model the change (lightweight STRIDE).** For the changed feature ask: who is the
   attacker, what do they want, what's the worst case? Spoofing (auth), Tampering (integrity),
   Repudiation (logs), Information disclosure (leaks), Denial of service, Elevation of privilege.
   Write one sentence per relevant category. This focuses the rest of the review.
4. **Secrets sweep first.** Before anything else, scan for leaked secrets — this is the
   highest-frequency critical finding. See the Secrets section below. A leaked key is CRITICAL
   regardless of how clean the rest of the code is.
5. **Walk the OWASP Top 10 + API Top 10** against the changed surface, using the checklist.
6. **Verify access control concretely**, not by reading code. For Supabase, query the policies.
   For an API, trace a request from an attacker's token to the data and confirm each hop checks
   ownership/role. Broken access control (IDOR) is OWASP #1 and the easiest to miss by reading.
7. **Review dependencies / supply chain.** `npm audit`, check the lockfile diff for new or
   suspicious packages, confirm no `postinstall` scripts from unknown authors.
8. **Rank every finding by severity** (Critical / High / Medium / Low / Info) with impact +
   exploitability + a concrete fix. Output the report. Block the merge on any Critical or High.
9. **Re-verify after the fix.** A fix can introduce a new hole (e.g. a broadened RLS policy).
   Re-run the affected section, don't assume.

## Full Checklist

### Secrets & configuration (do this FIRST)
- [ ] No secret is bundled into client code. In Vite, only `VITE_`-prefixed vars reach the
      browser — confirm `service_role`, DB passwords, API private keys are NOT `VITE_`-prefixed.
- [ ] In Next.js, secrets are NOT prefixed `NEXT_PUBLIC_` and are only read in server code
      (server components, route handlers, server actions) — never in `"use client"` files.
- [ ] Supabase `anon` key is the only Supabase key in the browser; `service_role` lives
      strictly server-side (edge function / API route / n8n credential store).
- [ ] `.env`, `.env.local`, `.env.*.local` are in `.gitignore` and NOT committed. Check
      `git log -p` / history if there's any doubt — a key in history is still leaked.
- [ ] No hardcoded tokens, passwords, connection strings, or API keys in source (grep for
      `sk-`, `service_role`, `eyJ`, `BEGIN PRIVATE KEY`, `password =`, `secret =`).
- [ ] CI/CD and host (Vercel/host) secrets are configured as env vars, not in the repo.
- [ ] Rotate any key that was ever exposed — removing it from code is NOT enough.

### A01 Broken Access Control / IDOR (highest priority)
- [ ] Every protected route checks authentication AND authorization (role + resource ownership).
- [ ] Object access is scoped to the caller: `where user_id = auth.uid()`, never trusting an
      `id` from the request to belong to the user (classic IDOR).
- [ ] No "security by obscurity" — hidden UI buttons don't protect the endpoint behind them.
- [ ] Admin-only actions verify the role server-side, not via a client flag or hidden route.
- [ ] Default-deny: new routes/tables are locked down by default, then opened intentionally.
- [ ] Vertical privilege escalation tested: can a normal user hit an admin endpoint?
- [ ] Horizontal escalation tested: can user A read/modify user B's records by changing an id?

### Supabase RLS verification (if `supabase/` present)
- [ ] RLS is ENABLED on every table holding user/PII data (`alter table ... enable row level
      security;`). A table without RLS + the anon key = full public read/write.
- [ ] Each table has explicit `select` / `insert` / `update` / `delete` policies — not just
      `for all`. Mismatched verbs are a common leak.
- [ ] Policies use `auth.uid()` to scope rows to the owner; `insert` policies have a
      `with check` (not just `using`) so users can't insert rows owned by someone else.
- [ ] No policy uses `true` as the condition on a sensitive table unless intentionally public.
- [ ] `service_role` usage bypasses RLS — confirm it's only used server-side for trusted ops.
- [ ] Verify by actually querying: `select * from pg_policies where tablename = '...';` and
      test as an anon/authenticated user, not by reading the migration and assuming.
- [ ] Storage buckets have policies; "public" buckets don't hold private files.

### A02 Cryptographic failures / data in transit & at rest
- [ ] HTTPS everywhere; no secrets or tokens over `http://`.
- [ ] Passwords hashed with bcrypt/argon2/scrypt (or delegated to Supabase Auth) — never
      plain, never MD5/SHA1.
- [ ] No sensitive data in URLs/query strings (they land in logs and history).
- [ ] PII at rest is access-controlled; consider column-level restrictions for the most sensitive.

### A03 Injection (SQLi / XSS / command / NoSQL)
- [ ] All SQL is parameterized / uses the query builder — never string-concatenated user input.
- [ ] No `dangerouslySetInnerHTML` / `v-html` with unsanitized input. If HTML is required,
      sanitize with DOMPurify and a strict allowlist.
- [ ] User input rendered as text, not interpreted as markup; framework escaping is intact.
- [ ] No `eval`, `new Function`, or templating of user input into code.
- [ ] No shell commands built from user input; if unavoidable, use argument arrays, not strings.

### A04 Insecure design / business logic
- [ ] Rate limiting on auth, OTP, password reset, and expensive endpoints (anti brute-force).
- [ ] Idempotency on payment/order mutations to prevent double-submit abuse.
- [ ] Server enforces all business rules (price, quantity, role) — client values are hints only.

### A05 Security misconfiguration
- [ ] No verbose stack traces / debug pages in production.
- [ ] CORS is restricted to known origins, not `*` for credentialed requests.
- [ ] Default/admin credentials changed; no test accounts in prod.
- [ ] Directory listing and source maps with secrets are not exposed.

### A06 Vulnerable & outdated components (supply chain)
- [ ] `npm audit` run; no unaddressed High/Critical advisories.
- [ ] Lockfile diff reviewed — no unexpected new transitive deps, no typosquat names.
- [ ] No package with a sketchy `postinstall` script added from an unknown author.
- [ ] Dependencies pinned/locked; renovate/dependabot or a manual update cadence exists.

### A07 Identification & authentication failures / JWT
- [ ] JWTs are validated (signature + `exp` + `aud`/`iss`) server-side, not just decoded.
- [ ] Tokens are short-lived; refresh flow is secure; logout invalidates session.
- [ ] Session cookies are `HttpOnly`, `Secure`, `SameSite=Lax/Strict`.
- [ ] No JWT secret in the client; `alg: none` rejected; no algorithm confusion.
- [ ] Password reset / OTP tokens are single-use, time-boxed, and rate-limited.

### A08 Software & data integrity / A10 SSRF
- [ ] Server-side fetches to user-supplied URLs are blocked from internal/metadata addresses
      (no `169.254.169.254`, `localhost`, private ranges) — SSRF guard.
- [ ] Webhooks verify signatures (Stripe, WhatsApp, etc.) before trusting the payload.
- [ ] Redirects use an allowlist; no open redirect via `?redirect=` to arbitrary hosts.

### CSRF (cookie-session apps)
- [ ] State-changing requests require a CSRF token or use `SameSite` cookies + same-origin checks.
- [ ] Pure Bearer-token APIs (no cookies) are not CSRF-prone — don't add token theater there.

### File uploads
- [ ] Validate type by content (magic bytes), not just extension or client MIME.
- [ ] Enforce max size; reject zip-bombs; randomize stored filenames (no path traversal).
- [ ] Uploaded files served from a separate origin/bucket, never executed as code.
- [ ] Images re-encoded/stripped of EXIF where privacy matters.

### Logging, monitoring & PII / LGPD
- [ ] No secrets, tokens, passwords, or full PII written to logs.
- [ ] Security-relevant events (login, role change, admin action) are logged with actor + time.
- [ ] PII collection is minimized and justified; consent captured where LGPD requires.
- [ ] Data deletion/export path exists for data-subject requests; retention is bounded.

### Output & sign-off
- [ ] Every finding has: severity, location (file:line), impact, exploit sketch, and fix.
- [ ] Findings sorted by severity; no Critical/High left open before merge.

## Security & Quality rules
- **Verify, don't trust the code's intent.** "It checks the role" is not a finding resolution —
  trace the actual request path and, for RLS, query `pg_policies` and test as the attacker role.
- **Default-deny over allow-by-default.** Every new surface starts locked; you open exactly
  what's needed and document why.
- **A leaked secret is always Critical** and always requires rotation, not just removal.
- **Least privilege** for keys, roles, RLS, and CORS. The `service_role` key never leaves the server.
- **Fail closed.** On auth/validation errors, deny the request; never fall through to success.
- **No security through obscurity.** Obfuscation is not a control.
- For deep authn/authz patterns (JWT lifecycle, OAuth, RBAC, session design), defer to the
  `auth-implementation-patterns` skill rather than reinventing them here.

## Real-world Example — catching a `service_role` key shipped to the client
During review of a Pralis admin dashboard (React + Vite + Supabase), the diff added a "fast"
admin client:

```ts
// src/admin/supabaseAdmin.ts  — FOUND IN A CLIENT BUNDLE. CRITICAL.
import { createClient } from "@supabase/supabase-js";
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE, // <-- service_role, VITE_-prefixed = shipped to browser
);
```

The secrets sweep flagged it immediately: a `VITE_`-prefixed `service_role` key is compiled
into the JS bundle and visible to anyone via DevTools. The `service_role` key **bypasses RLS**,
so any visitor could read and write every table.

**Severity: CRITICAL** (Broken Access Control + leaked secret).
**Impact:** total data exposure of all colaboradores/PII; full write access.
**Fix:**
1. Remove the admin client from the frontend entirely; move privileged operations to a
   Supabase Edge Function / server route that holds `SUPABASE_SERVICE_ROLE` as a non-public
   server env var.
2. From the browser, use only the `anon` key and rely on RLS policies scoped by `auth.uid()`.
3. **Rotate the `service_role` key** in the Supabase dashboard — it was in a shipped bundle and
   must be considered compromised.
4. Add an RLS verification step: enable RLS on every table, confirm `pg_policies` covers
   select/insert/update/delete, and test as an anon user.

Re-verification confirmed the bundle no longer contained the key (grep the `dist/` output for
`service_role`) and RLS denied anon writes.

## Done criteria
- The relevant checklist sections were run against the actual changed surface (stack-aware).
- Access control was verified by tracing/querying, not by reading intent.
- Secrets sweep is clean; any exposed key is rotated, not just removed.
- `npm audit` reviewed; no open High/Critical supply-chain advisories.
- A severity-ranked report exists with location + impact + fix for each finding.
- No Critical or High finding remains open before merge/deploy.

## Related skills & agents
- Agent: `security-reviewer` (this checklist is its operating procedure).
- Skill: `auth-implementation-patterns` — JWT/OAuth/RBAC/session deep dive.
- Skill: `sql-optimization-patterns` — safe, parameterized, indexed queries.
- Skill: `supabase-safe-backend` — RLS and server-side Supabase patterns.
- Skill: `project-context-builder` — stack detection that scopes this checklist.
- Skill: `error-handling-patterns` — fail-closed error semantics.
- Agent: `master-orchestrator` — owns the 360° gate that invokes this before delivery.
- Agent: `deployment-specialist` — runs `deployment-checklist` after security passes.

> Before deciding stack/conventions, read Marco's global files (`~/.claude/CLAUDE.md`,
> `~/.claude/STACK.md`) and detect the stack via `project-context-builder`.
