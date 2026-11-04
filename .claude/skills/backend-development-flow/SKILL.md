---
name: backend-development-flow
description: End-to-end flow to build a backend feature safely — contract-first, validated,
  layered, observable, tested. Use when Marco says "cria um endpoint", "API que faz X",
  "salva no banco", "rota de backend", "webhook", "lógica do servidor", or asks to add any
  server-side behavior. Turns a simple request into a production-grade, reviewable feature.
---

# Backend Development Flow

## Purpose / When to use

Use this skill whenever you are about to add or change **server-side behavior**: a new
endpoint, a background job, a webhook receiver, a queue consumer, a cron task, or any code
that mutates data or talks to external systems. Marco usually asks in simple terms ("salva
o pedido no banco", "manda no WhatsApp quando pagar"). This flow turns that into a feature
that a Staff engineer would be comfortable shipping: a defined contract, real input
validation, clean layering, an explicit error taxonomy, idempotency where money or
external effects are involved, structured logs/traces, and tests that prove it works.

The single most important idea: **a backend endpoint is a public contract and a trust
boundary.** Everything crossing it is hostile until validated. You design the contract
first, then enforce it, then implement behind it, then observe it, then test it. You do NOT
start by writing the database call.

Do NOT use this for pure UI work (use `frontend-quality-flow`) or for schema design in
isolation (use `database-safe-design`). Do use it together with `supabase-safe-backend`
when the datastore is Supabase, and with `node-api-development` when you are standing up the
HTTP layer itself.

## Inputs you need

Before writing a line, collect these. If any is missing, infer a sane default and state it.

- **The real goal**, not the literal words. "Salva o pedido" usually means: validate the
  cart, compute totals server-side, persist atomically, emit a side effect (email/WhatsApp),
  and return a stable identifier. Restate the goal in one sentence.
- **The trigger**: HTTP request (method + path), webhook, scheduled job, or queue message.
- **The data contract**: exact request shape, exact response shape, and the error shapes.
- **Authn/authz**: who may call this, and which rows/resources they may touch.
- **Side effects**: payments, emails, messages, third-party APIs — anything not idempotent
  by nature. These decide whether you need an idempotency key.
- **Consistency needs**: does this require a transaction? what must be all-or-nothing?
- **The datastore + stack** — detect it, never assume (see step 1).

## Numbered Flow

### 1. Detect the stack and context (never assume)
Run the canonical detection from skill **project-context-builder**. Read `package.json`,
`tsconfig.json`, lockfiles, `vite.config.*` / `next.config.*`, and the `supabase/` dir.
Classify: Node API (Express/Fastify) | Next.js route handlers | Supabase Edge Functions |
n8n. This decides file layout, the router API, how env/secrets load, and how you run the
project. Also read Marco's `~/.claude/STACK.md` and `~/.claude/CLAUDE.md` for preferences.

Concretely, confirm:
- The validation library in use (`zod` is the default; honor an existing one).
- The error-handling convention already present (central error middleware? Result types?).
- The logging stack (pino? console? a wrapper?) and whether request IDs already exist.
- The test runner (`vitest` / `jest`) and how it's invoked.

### 2. Define the contract FIRST
Write the request/response/error contract as types and a `zod` schema before any logic.
The schema is the source of truth; derive the TypeScript type from it with `z.infer`, never
maintain two definitions by hand. Decide HTTP semantics: `201` for creation with a
`Location`/id, `200` for reads, `409` for conflicts (duplicate idempotency key), `422` for
validation failures, `404` for missing, `403` for authz, `401` for authn.

### 3. Layer the code: handler → service → repository
Three thin layers, each with one job:
- **Handler/route**: HTTP only. Parse + validate input, call the service, map the result or
  a thrown domain error to an HTTP status. No business logic, no SQL here.
- **Service**: the business rule. Pure-ish, framework-agnostic, unit-testable without HTTP.
  Owns transactions, authorization decisions, side-effect orchestration.
- **Repository**: data access only. One place that knows the table/columns. Returns domain
  objects, not raw rows. Makes swapping/optimizing the query trivial and testable.

This separation is what lets you test the rule without booting a server, and swap Supabase
for Postgres-direct without touching business code.

### 4. Validate at the boundary, parse don't validate
`schema.parse(req.body)` at the very top of the handler. From that line onward the data is
typed and trusted. Reject unknown fields (`.strict()`) so attackers can't smuggle
properties. Coerce and bound everything: quantities `>= 1`, prices server-computed (never
trust client totals), strings length-limited, enums whitelisted.

### 5. Define the error taxonomy
Create domain error classes the service throws and the handler maps. Reference skill
**error-handling-patterns**. Minimum set: `ValidationError (422)`, `NotFoundError (404)`,
`ConflictError (409)`, `UnauthorizedError (401)`, `ForbiddenError (403)`,
`ExternalServiceError (502)`. Each carries a stable machine-readable `code` and a safe
message. Never leak stack traces, SQL, or internal messages to the client.

### 6. Make external effects idempotent
If the operation creates money, sends a message, or calls a third party, it MUST be safe to
retry. Accept an `Idempotency-Key` header (or derive a natural key). Persist the key with
the result; on a repeat, return the stored result instead of re-executing. Wrap the
DB writes in a transaction so a partial failure rolls back cleanly.

### 7. Add observability
Structured logs (JSON), one log line per request with: request id, route, user id, latency,
outcome, and an error `code` on failure. Never log secrets, tokens, full card/PII, or raw
request bodies containing them. Add a trace/timer around external calls so slow dependencies
are visible. A feature you can't see in logs is a feature you can't operate.

### 8. Test the layers
Unit-test the service (happy path + each error branch + idempotency replay). Integration-test
the handler against the validation schema (bad input → 422, unauthorized → 403, conflict →
409). Reference **javascript-testing-patterns**. Then run the real gates: `npx tsc --noEmit`,
`npm run lint`, `npm test`, `npm run build`.

### 9. Self-review against the checklist, then hand off
Run the Full Checklist below. Hand to `security-reviewer` and `qa-build-fixer` for the
360° gate before declaring done.

## Full Checklist

**Contract**
- [ ] Real goal restated in one sentence and confirmed with the request.
- [ ] HTTP method + path (or trigger) chosen with correct REST semantics.
- [ ] Request schema written in `zod` with `.strict()` (unknown keys rejected).
- [ ] Response schema defined; success status correct (`201` for create + id returned).
- [ ] Error response shape defined: `{ error: { code, message } }`, stable `code`s.
- [ ] Types derived from schemas via `z.infer` (no hand-duplicated types).

**Layering**
- [ ] Handler contains HTTP concerns only — no business logic, no SQL.
- [ ] Service is framework-agnostic and unit-testable without HTTP.
- [ ] Repository is the only place that knows table/column names.
- [ ] No layer reaches around another (handler never calls the repo directly).

**Validation & input safety**
- [ ] `schema.parse()` runs before any logic; nothing downstream trusts raw input.
- [ ] Numbers bounded (qty `>= 1`, sane max); strings length-capped; enums whitelisted.
- [ ] Money/totals computed server-side from trusted data, never from the client.
- [ ] IDs validated as UUID/expected format before they touch a query.
- [ ] File uploads (if any) checked for type, size, and content, not just extension.

**Authn / authz**
- [ ] Caller authenticated before the handler does work.
- [ ] Authorization checked against the specific resource (no IDOR — verify ownership).
- [ ] Authz lives in the service, not only in the route, so jobs/queues get it too.

**Errors**
- [ ] Domain error classes defined, each with a stable `code` and safe message.
- [ ] Handler maps every domain error to the correct HTTP status.
- [ ] Unhandled errors caught by a central handler → `500` with a generic body + logged id.
- [ ] No stack traces, SQL, or internal details ever sent to the client.

**Idempotency & consistency**
- [ ] External/money effects accept and persist an idempotency key.
- [ ] Replays return the stored result, not a second execution.
- [ ] Multi-write operations run in a single transaction (all-or-nothing).
- [ ] Side effects (email/WhatsApp/payment) fire only after the DB commit, or are reconciled.

**Observability**
- [ ] One structured log line per request with id, route, user, latency, outcome.
- [ ] External calls timed; failures logged with the dependency name and error code.
- [ ] No secrets, tokens, or PII in logs.
- [ ] A correlation/request id is propagated to downstream calls.

**Tests & gates**
- [ ] Service unit tests cover happy path, each error branch, and idempotency replay.
- [ ] Handler integration tests cover 422 / 401 / 403 / 404 / 409 paths.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run lint` clean.
- [ ] `npm test` green.
- [ ] `npm run build` succeeds.

## Security & Quality rules

- **Treat every input as hostile.** Validate at the boundary with a strict schema; reject,
  don't sanitize-and-hope. This is the single highest-leverage defense.
- **Never trust client-supplied money, prices, totals, or roles.** Recompute server-side.
- **Prevent IDOR.** Every read/write of a user-owned resource verifies the caller owns it.
  An authenticated user is not an authorized user.
- **Secrets only from env**, never hard-coded, never returned in responses, never logged.
  Service-role/admin credentials live server-side only (see `supabase-safe-backend`).
- **Parameterized queries always.** No string-concatenated SQL — ever. Use the driver/ORM
  bindings; this kills SQL injection at the source.
- **Fail closed.** On an unexpected error, deny and return a generic `500`; never default to
  allowing the action.
- **Idempotency for anything with an external effect** so retries (which WILL happen) don't
  double-charge or double-send.
- **Rate-limit and size-limit** untrusted endpoints to blunt abuse and accidental loops.
- **Quality bar:** strict TypeScript (no `any` at boundaries), pure testable services, and
  errors that are codes the frontend can branch on — not free-text strings.

## Real-world Example — "create order" endpoint

Marco's request: *"faz uma rota que cria o pedido e manda no WhatsApp"*. Stack detected:
Node + Fastify + TypeScript + Supabase, `zod` present, `pino` logging.

```ts
// contract.ts — source of truth
import { z } from "zod";

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).min(1),
  // NOTE: no `total` field. The client never sends money. We compute it.
}).strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

```ts
// errors.ts
export class AppError extends Error {
  constructor(public code: string, public status: number, msg: string) { super(msg); }
}
export const NotFound   = (m: string) => new AppError("NOT_FOUND", 404, m);
export const Conflict   = (m: string) => new AppError("CONFLICT", 409, m);
export const Forbidden  = (m: string) => new AppError("FORBIDDEN", 403, m);
```

```ts
// order.service.ts — business rule, no HTTP, no raw SQL
export async function createOrder(
  userId: string, input: CreateOrderInput, idempotencyKey: string, repo: OrderRepo
) {
  const existing = await repo.findByIdempotencyKey(idempotencyKey);
  if (existing) return existing;                 // safe replay — no double order

  const products = await repo.getProducts(input.items.map(i => i.productId));
  if (products.length !== input.items.length) throw NotFound("product missing");

  // money computed server-side, in integer cents — never trust the client
  const totalCents = input.items.reduce((sum, item) => {
    const p = products.find(p => p.id === item.productId)!;
    return sum + p.priceCents * item.quantity;
  }, 0);

  const order = await repo.createInTransaction({  // atomic: order + items + key
    userId, items: input.items, totalCents, idempotencyKey, status: "pending",
  });

  return order; // WhatsApp send happens AFTER commit, reconciled if it fails
}
```

```ts
// order.handler.ts — HTTP only
app.post("/orders", async (req, reply) => {
  const userId = req.user.id;                              // set by auth middleware
  const input = createOrderSchema.parse(req.body);         // validate at boundary
  const key = req.headers["idempotency-key"] as string ?? crypto.randomUUID();
  try {
    const order = await createOrder(userId, input, key, repo);
    req.log.info({ route: "POST /orders", userId, orderId: order.id }, "order created");
    reply.code(201).header("Location", `/orders/${order.id}`).send({ id: order.id });
  } catch (e) {
    if (e instanceof AppError) return reply.code(e.status).send({ error: { code: e.code, message: e.message } });
    req.log.error({ err: e, userId }, "order failed");
    return reply.code(500).send({ error: { code: "INTERNAL", message: "unexpected error" } });
  }
});
```

**Why this is staff-level, not a toy:** the client cannot set the price; the schema rejects
unknown fields; the operation is atomic and replay-safe via the idempotency key; errors are
machine-codes the frontend can branch on; the WhatsApp side effect is deliberately *after*
commit so a messaging outage never loses an order; and every layer is independently testable.

**The bad version** (what to refuse): a single route that reads `req.body.total`, builds SQL
by string concatenation, inserts the order and sends WhatsApp in the same un-transacted
block, and returns `res.send("ok")`. It can be double-charged on retry, injected, priced by
the attacker, and is unobservable. Never ship that.

## Done criteria

- The contract (request/response/error schemas) is written and enforced at the boundary.
- Code is layered handler → service → repository with no leaks between layers.
- Every error path returns the correct status with a stable `code` and no leaked internals.
- External/money effects are idempotent and DB writes are transactional.
- Structured logging is in place with no secrets/PII.
- `tsc --noEmit`, lint, tests, and build all pass.
- `security-reviewer` and `qa-build-fixer` have signed off in the 360° gate.

## Related skills & agents

- Skills: `project-context-builder`, `node-api-development`, `supabase-safe-backend`,
  `database-safe-design`, `nodejs-backend-patterns`, `error-handling-patterns`,
  `auth-implementation-patterns`, `javascript-testing-patterns`, `security-checklist`,
  `build-and-test-checklist`.
- Agents: `backend-architect` (owns architecture), `node-api-expert` (HTTP layer),
  `supabase-specialist` (when the datastore is Supabase), `database-architect` (schema),
  `security-reviewer` and `qa-build-fixer` (360° gate), `master-orchestrator` (final gate).

> Before deciding stack/architecture, read Marco's `~/.claude/STACK.md`, `~/.claude/CLAUDE.md`,
> and run stack detection via `project-context-builder`. Never assume the stack.
