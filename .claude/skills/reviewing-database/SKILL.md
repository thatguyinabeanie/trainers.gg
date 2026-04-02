---
name: reviewing-database
description: Use when reviewing or writing database changes — covers RLS policies, migrations, indexes, N+1 queries, unbounded fetches, and query efficiency
---

# Reviewing Database

Checklist for database changes: migrations, RLS policies, query patterns, and indexing.

## Migration Checks

- [ ] RLS enabled on new tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] SELECT, INSERT, UPDATE, DELETE policies defined (or commented why not)
- [ ] `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotency
- [ ] `IF NOT EXISTS` / `IF EXISTS` guards on all DDL
- [ ] `(SELECT auth.uid())` initplan pattern — not bare `auth.uid()`
- [ ] No `USING(true)` unless intentional with comment explaining why
- [ ] Foreign keys have explicit `ON DELETE` behavior with comment if using default RESTRICT
- [ ] `NOT NULL` on columns that should never be null (especially `created_at`)
- [ ] Snake_case column names, meaningful table names
- [ ] Column comments on non-obvious fields (`COMMENT ON COLUMN`)

## RLS Policy Patterns

```sql
-- Good: initplan pattern (evaluated once per query)
WHERE a.user_id = (SELECT auth.uid())

-- Bad: re-evaluated per row
WHERE a.user_id = auth.uid()

-- Good: service role check with initplan
USING ((SELECT auth.role()) = 'service_role')
```

## Indexing Checks

- [ ] New columns used in `WHERE`, `JOIN`, `ORDER BY`, or `GROUP BY` have indexes
- [ ] Foreign key columns have indexes (Postgres does NOT auto-index FKs)
- [ ] Composite indexes for multi-column filters (e.g., `WHERE community_id = X AND status = Y`)
- [ ] `UNIQUE` constraints where business logic requires uniqueness
- [ ] Consider partial indexes for status-filtered queries (`WHERE status = 'active'`)

### When to Add an Index

| Query Pattern                     | Index Type                   |
| --------------------------------- | ---------------------------- |
| `WHERE col = value`               | B-tree on `col`              |
| `WHERE col1 = X AND col2 = Y`     | Composite `(col1, col2)`     |
| `ORDER BY col`                    | B-tree on `col`              |
| `WHERE col IN (...)`              | B-tree on `col`              |
| FK column used in CASCADE deletes | B-tree on FK column          |
| Text search / `ILIKE`             | Consider `pg_trgm` GIN index |

## Query Efficiency Checks

- [ ] **N+1 queries**: Loops making one DB call per iteration — refactor to `IN` clauses or joins
- [ ] **Unbounded fetches**: `select("*")` without `.limit()` that could grow — add limits or use SQL aggregation (RPC/views)
- [ ] **Sequential independent queries**: Use `Promise.all` for queries with no dependencies
- [ ] **Full table scans**: Queries without `WHERE` on an indexed column
- [ ] **Redundant queries**: Same data fetched by multiple functions in the same render — consider sharing results or accepting parameters
- [ ] **Count queries**: Use `select("*", { count: "exact", head: true })` instead of fetching all rows to count in JS
- [ ] **Aggregation in JS**: `GROUP BY`, `COUNT(DISTINCT)`, `SUM` — push to SQL via RPC when the dataset could grow

## Supabase Client Selection

| Client                                                      | When                                          |
| ----------------------------------------------------------- | --------------------------------------------- |
| `createStaticClient()`                                      | Public data, `unstable_cache`, no auth needed |
| `createClient()`                                            | Authenticated mutations, read-write cookies   |
| `createClientReadOnly()`                                    | Authenticated reads, read-only cookies        |
| `createServiceRoleClient()` / `createAdminSupabaseClient()` | Bypass RLS (service operations only)          |

Never use `createClient()` (authenticated) inside `unstable_cache`. Use `createStaticClient()`.

## Anti-Patterns

```typescript
// BAD: N+1 — one query per item
for (const id of ids) {
  const { data } = await supabase.from("items").select("*").eq("id", id);
}

// GOOD: batch query
const { data } = await supabase.from("items").select("*").in("id", ids);

// BAD: fetch all rows to count
const { data } = await supabase.from("registrations").select("*");
const count = data.length;

// GOOD: DB-side count
const { count } = await supabase
  .from("registrations")
  .select("*", { count: "exact", head: true });

// BAD: aggregate in JS
const { data } = await supabase.from("regs").select("user_id");
const unique = new Set(data.map(r => r.user_id)).size;

// GOOD: SQL aggregation via RPC
const { data } = await supabase.rpc("count_unique_players", { ... });
```
