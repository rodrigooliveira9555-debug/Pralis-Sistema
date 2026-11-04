---
name: database-safe-design
description: Design a safe, correct, performant relational schema — normalization, keys,
  indexes, constraints (CHECK / FK / UNIQUE), money as integer cents, soft-delete/audit
  columns, safe expand→migrate→contract migrations, EXPLAIN analysis, and N+1 avoidance.
  Use when Marco says "modela o banco", "cria as tabelas", "estrutura do banco", "schema",
  "relaciona as tabelas", "migration", or when a feature needs persistence. Ships a schema
  the database itself enforces, not one that hopes the app behaves.
---

# Database Safe Design

## Purpose / When to use

Use this skill when you design or change a **relational schema** (Postgres/Supabase/MySQL):
new tables, relationships, constraints, indexes, or migrations. Marco asks simply ("modela o
banco de pedidos"); this flow produces a schema that a Staff data engineer would defend in
review — one where **the database enforces correctness**, queries are fast by design, and
schema changes ship without downtime.

The governing belief: **the database is your last line of defense for data integrity, and
your first for performance.** Application code has bugs, gets bypassed by scripts, and runs
in multiple services; a `CHECK` constraint or a `FOREIGN KEY` does not. Push invariants down
into the schema. Bad data that the database refuses to store is a bug that can never happen.

This pairs with **supabase-safe-backend** (RLS sits on top of this schema) and
**backend-development-flow** (the service writes to it). Use **sql-optimization-patterns** for
deep query tuning; this skill is about getting the *structure* right so tuning is rarely
needed.

## Inputs you need

- **The entities and their relationships** — what things exist (user, order, order_item,
  product) and how they relate (one-to-many, many-to-many).
- **The access patterns** — how rows will actually be queried (by user_id? by status? by
  date range?). Indexes follow queries, not hunches.
- **The invariants** — rules that must ALWAYS hold (a price is never negative; a status is
  one of a fixed set; an email is unique). These become constraints.
- **Money/quantity semantics** — currencies, rounding, units. Decide cents-as-integer now.
- **Lifecycle needs** — hard delete vs soft delete, audit trail, who/when columns.
- **The DBMS + stack** — Postgres (likely, via Supabase) vs MySQL changes types and syntax.
  Detect it; never assume.

## Numbered Flow

### 1. Detect the database and conventions
Via skill **project-context-builder**, confirm the DBMS and migration tooling. For Supabase:
`supabase/migrations/`, Postgres types, `gen_random_uuid()`. Read existing migrations to
match naming (snake_case tables/columns, `_id` FKs, `created_at/updated_at`). Read Marco's
`~/.claude/STACK.md`. Match the house style instead of inventing a new one.

### 2. Model entities and normalize (to 3NF, then stop)
Normalize to third normal form by default: every non-key column depends on the key, the
whole key, and nothing but the key. This eliminates update anomalies and duplicated truth.
Denormalize ONLY with a measured read reason, and document it. Resist storing arrays/JSON for
data you'll query or join on — that's a relation trying to escape; give it a table.

### 3. Choose keys deliberately
- **Primary key**: prefer a surrogate `uuid` (`gen_random_uuid()`) or `bigint identity`. UUIDs
  don't leak row counts and are safe to expose in URLs; sequential bigints are smaller/faster
  but enumerable. Pick per case.
- **Natural keys** (email, slug) become `UNIQUE` constraints, not the PK.
- **Foreign keys** on every relationship with an explicit `ON DELETE` rule (`cascade` for
  children like `order_items`, `restrict`/`set null` where history must survive).

### 4. Push invariants into constraints
This is the highest-value step. For every rule, add a constraint:
- `NOT NULL` on everything that must exist (the default mindset; nullable is the exception).
- `CHECK` for value rules: `total_cents >= 0`, `quantity >= 1`, `status in (...)`.
- `UNIQUE` (single or composite) for "no duplicates" rules: one cart item per (order, product).
- `FOREIGN KEY` for every reference; never an orphan-able loose id.
- Sensible `DEFAULT`s (`now()`, `'pending'`) so rows are born valid.

### 5. Represent money as integer cents
Never store money as `float`/`double` — binary floats can't represent `0.10` exactly and will
silently lose cents. Use `integer`/`bigint` cents (`total_cents`) or `numeric(12,2)` if you
need decimals. Store currency alongside if multi-currency. Do arithmetic in integers.

### 6. Add lifecycle, audit, and timestamps
Standard columns on most tables: `created_at timestamptz default now()`,
`updated_at timestamptz default now()` (kept current by a trigger), and for entities you must
not lose, `deleted_at timestamptz null` for **soft delete** (filter `where deleted_at is null`)
instead of hard `DELETE`. For sensitive entities, add `created_by`/`updated_by`. Soft delete
preserves history and makes "undo" and audits possible.

### 7. Index for the real access patterns
Index the columns you filter/join/sort on — especially every FK (Postgres does NOT auto-index
FKs) and frequent `WHERE` columns. Use composite indexes in the order of the query's equality
then range columns. Add partial indexes for hot subsets (`where deleted_at is null`). Don't
over-index: every index slows writes and costs storage. Reference **sql-optimization-patterns**.

### 8. Verify with EXPLAIN and kill N+1
Run `EXPLAIN ANALYZE` on the key queries. Look for `Seq Scan` on large tables where an index
should help, and for row-estimate vs actual blowups. At the app layer, hunt **N+1**: fetching
a list then looping a query per row. Fix with a join, an `IN (...)` batch, or a single
query — the difference between 1 query and 200 is the difference between 5ms and 2s.

### 9. Change schema safely: expand → migrate → contract
Never do a breaking, downtime-causing migration. Three phases, each its own deployable
migration:
1. **Expand** — add the new column/table/index *nullable and additive*; deploy. Nothing breaks.
2. **Migrate** — backfill data and update the app to write/read the new shape; deploy.
3. **Contract** — once nothing uses the old shape, drop it; deploy.
Add indexes `CONCURRENTLY` on big tables to avoid write locks. This sequence lets old and new
code run simultaneously during a rollout, which is what makes zero-downtime deploys possible.

### 10. Review and gate
Run the checklist, apply migrations to a local/staging DB, verify constraints reject bad data,
and confirm `EXPLAIN` is clean. Hand to `database-architect` / `performance-reviewer`.

## Full Checklist

**Modeling & normalization**
- [ ] Entities and relationships mapped; cardinalities (1:N, N:M) explicit.
- [ ] Many-to-many uses a join table with a composite unique key.
- [ ] Normalized to 3NF; any denormalization is deliberate, measured, and documented.
- [ ] No queryable/joinable data hidden inside JSON/array columns.

**Keys & relationships**
- [ ] Every table has a primary key (surrogate uuid/bigint chosen on purpose).
- [ ] Natural keys (email/slug) enforced as `UNIQUE`, not used as the PK.
- [ ] Every relationship has a `FOREIGN KEY` with an explicit `ON DELETE` rule.
- [ ] No orphan-able loose ids (every reference is constrained).

**Constraints (DB enforces invariants)**
- [ ] `NOT NULL` on all columns that must exist; nullable is the justified exception.
- [ ] `CHECK` constraints for value rules (non-negative money, qty ≥ 1, valid enums).
- [ ] `UNIQUE` (single/composite) for every "no duplicates" rule.
- [ ] Sensible `DEFAULT`s so new rows are valid by construction.

**Money & types**
- [ ] Money stored as integer cents (or `numeric`), NEVER `float`/`double`.
- [ ] Currency stored alongside amounts if multi-currency.
- [ ] Timestamps are `timestamptz` (timezone-aware), not naive `timestamp`.
- [ ] Enums modeled via `CHECK` or a lookup table (not free-text).

**Lifecycle & audit**
- [ ] `created_at` / `updated_at` present; `updated_at` maintained by a trigger.
- [ ] Soft delete (`deleted_at`) used where history must survive; queries filter it.
- [ ] `created_by` / `updated_by` on sensitive entities.

**Indexes & performance**
- [ ] Every foreign key is indexed (Postgres won't do it for you).
- [ ] Indexes match real filter/join/sort columns; composite order is correct.
- [ ] Partial indexes for hot subsets (e.g. active rows) where it pays off.
- [ ] Not over-indexed (write cost considered).
- [ ] `EXPLAIN ANALYZE` run on key queries; no unexpected seq scans on big tables.
- [ ] N+1 patterns identified and replaced with joins/batched `IN` queries.

**Migrations**
- [ ] Changes are versioned SQL in the migrations dir and committed to git.
- [ ] Breaking changes follow expand→migrate→contract across separate deploys.
- [ ] Indexes on large tables created `CONCURRENTLY`.
- [ ] Migration tested on a copy/staging before production; rollback considered.

**Verification**
- [ ] Constraints verified to REJECT bad data (insert a negative price → fails).
- [ ] Schema reviewed by `database-architect` / `performance-reviewer`.

## Security & Quality rules

- **Let the database enforce truth.** Every invariant you can express as a constraint, you
  must — `CHECK`, `FK`, `UNIQUE`, `NOT NULL`. App-only validation is bypassed by the next
  script, migration, or service. Bad data the DB refuses can never exist.
- **Money is integer cents, never float.** Floating point silently loses money; this is a
  data-corruption bug, not a style preference.
- **Foreign keys with explicit `ON DELETE`.** Orphaned rows are silent corruption. Decide
  cascade vs restrict vs set-null per relationship on purpose.
- **Soft-delete what you can't afford to lose**; hard-delete only truly disposable rows.
  Preserve audit trails for anything financial or legal (LGPD/PII record-keeping).
- **Index every FK and every real filter column** — and stop there. Missing FK indexes cause
  slow joins and lock contention on deletes; excess indexes slow every write.
- **Expand→migrate→contract for any breaking change** so old and new code coexist during
  rollout — the foundation of zero-downtime deploys and safe rollback.
- **`EXPLAIN` before you ship a query that runs on a big table.** Don't guess at performance;
  measure it.
- **Constrain PII columns and minimize them.** Don't store what you don't need; the safest
  data is the data you never collected.

## Real-world Example — good vs bad orders schema

Marco: *"banco de pedidos: cada pedido tem itens e um total"*. DBMS: Postgres (Supabase).

**Good — invariants in the schema, money in cents, audit + soft delete, indexed FKs:**
```sql
create table public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete restrict,
  status      text not null default 'pending'
                check (status in ('pending','paid','shipped','cancelled')),
  total_cents integer not null check (total_cents >= 0),  -- money as integer cents
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz                                 -- soft delete, keep history
);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  quantity    integer not null check (quantity >= 1),
  price_cents integer not null check (price_cents >= 0),   -- snapshot price at purchase
  unique (order_id, product_id)                            -- no duplicate line items
);

-- Postgres does NOT auto-index FKs; index them for joins and cascade deletes
create index on public.order_items (order_id);
create index on public.order_items (product_id);
-- partial index for the common "active orders for a user" query
create index orders_user_active_idx on public.orders (user_id)
  where deleted_at is null;
```

**Bad — the schema enforces nothing (NEVER ship this):**
```sql
create table orders (
  id serial primary key,           -- sequential, enumerable, leaks order count
  user_id int,                     -- no FK: can point to a non-existent user
  status varchar,                  -- free text: 'paid', 'Paid', 'pago', typos all allowed
  total float,                     -- FLOAT money: 19.99 stored as 19.989999... loses cents
  items json                       -- line items as JSON: can't join, index, or constrain
);                                 -- no created_at, no audit, no checks, no soft delete
```
Why the good one is staff-level: a negative total, a quantity of zero, an unknown status, a
duplicate line item, or an order pointing at a deleted user are all **impossible** — the
database rejects them. Money is exact. Deleting an order cascades its items but is *blocked*
from deleting a referenced user, so history survives. The FKs are indexed so the
`orders → order_items` join and the cascade delete are fast. The bad one will, in production,
accumulate inconsistent statuses, fractional-cent money errors, orphaned rows, and
unqueryable JSON — corruption that no amount of app code fully prevents.

**N+1 to avoid (app layer):**
```ts
// BAD: 1 query for orders, then 1 per order for items → N+1 (201 queries for 200 orders)
const orders = await repo.listOrders(userId);
for (const o of orders) o.items = await repo.itemsFor(o.id);

// GOOD: one query, batched by the parent ids
const orders = await repo.listOrders(userId);
const items  = await repo.itemsForOrders(orders.map(o => o.id)); // ... WHERE order_id = ANY($1)
```

## Done criteria

- Schema normalized to 3NF (deliberate, documented exceptions only).
- Every relationship has a FK with an explicit `ON DELETE`; every FK is indexed.
- Invariants enforced by `NOT NULL` / `CHECK` / `UNIQUE` constraints; rows born valid via defaults.
- Money stored as integer cents; timestamps are `timestamptz`; audit + soft-delete columns present.
- Indexes match real access patterns; key queries verified with `EXPLAIN`; no known N+1.
- Schema changes shipped as versioned migrations following expand→migrate→contract.
- Constraints verified to reject bad data; `database-architect`/`performance-reviewer` signed off.

## Related skills & agents

- Skills: `project-context-builder`, `sql-optimization-patterns`, `supabase-safe-backend`,
  `backend-development-flow`, `node-api-development`, `security-checklist`,
  `build-and-test-checklist`, `deployment-checklist`.
- Agents: `database-architect` (owns this skill), `supabase-specialist` (RLS on top of it),
  `backend-architect` (how services use it), `performance-reviewer` (indexes/EXPLAIN/N+1 gate),
  `security-reviewer` (PII/constraints), `master-orchestrator` (final gate).

> Before modeling, read Marco's `~/.claude/STACK.md` and `~/.claude/CLAUDE.md`, and detect the
> DBMS/migration tooling via `project-context-builder`. Never assume Postgres vs MySQL.
