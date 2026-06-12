# Supabase -> PostgreSQL Migration Report

## Outcome
- Build succeeds (`bun run build`)
- Zero active runtime imports of `@supabase/*` or `@/integrations/supabase/*`
- Stack: Nginx -> TanStack Start (Node 22) -> PostgreSQL 16
- Auth: session cookie + scrypt password hashing (`node:crypto`)
- Self-hostable on a single Ubuntu VPS

## Files added
- `src/db/client.server.ts`, `src/db/schema.ts`
- `src/lib/session.server.ts`, `src/lib/auth.functions.ts`, `src/lib/api.functions.ts`
- `src/routes/register.tsx`
- `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `.env.example`
- `install.sh`, `update.sh`, `backup.sh`, `restore.sh`
- `db/init.sql`, `db/seed.sql`, `db/migrations/`
- `DEPLOYMENT.md`, `MIGRATION_REPORT.md`

## Files removed
- `src/integrations/supabase/` (entire directory)
- `supabase/` (config + migrations)
- `wrangler.jsonc`
- Dependencies: `@supabase/supabase-js`, `@node-rs/argon2`, `@cloudflare/vite-plugin`

## Files changed
- `src/routes/settings.tsx` - all `supabase.from(...)` calls replaced with: `listTemplates`, `upsertTemplate`, `deleteTemplate`, `addCategory`, `renameCategory`, `deleteCategory`, `listCategories`, `listSavings`, `addSavings`, `updateSavingsAmount`, `renameSavings`, `deleteSavings`, `setHouseDefaults`
- `src/routes/index.tsx`, `src/routes/register.tsx` - email/password auth UI
- `src/components/Sidebar.tsx`, `src/components/AccountPage.tsx`, `src/routes/credit-card.tsx` - call new server fns
- `src/lib/auth.ts` - `useCurrentUser` uses `whoami`
- `src/lib/settings.ts`, `src/lib/templates.ts`, `src/lib/recurring.ts` - server-fn backed
- `src/start.ts` - dropped Supabase middleware
- `vite.config.ts` - `nitro: { preset: "node-server" }`
- `package.json` - added `drizzle-orm`, `pg`, `cookie`; removed Supabase + argon2

## Runtime Supabase audit
```
$ rg 'supabase|@supabase' src/
(no results)
```

## Environment variables
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres URI (required at runtime) |
| `NODE_ENV` | `production` |
| `PORT` | App listen port (default 3000) |
| `POSTGRES_DB/USER/PASSWORD` | Compose only; used to construct `DATABASE_URL` |

## Deployment
See `DEPLOYMENT.md`.

## Caveats
1. Lovable preview is intentionally broken (Lovable forces Cloudflare preset; outside Lovable, `vite.config.ts` selects `node-server`).
2. Seed `db/seed.sql` placeholder users have non-functional password hashes - register Helly and Chazy from `/register` after first deploy.
3. No TLS bundled - add Let's Encrypt to `nginx.conf` on the host.