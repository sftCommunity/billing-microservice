# billing-microservice

Plans and **subscriptions** keyed by **`tenantId`** (UUID aligned with `tenants` in **auth-microservice**). No payment integration in the current MVP.

## Environment

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port for `GET /health` (default **3006** in root Compose) |
| `NATS_SERVERS` | Comma-separated NATS URLs |
| `DATABASE_URL` | Postgres connection string (Prisma) |

## Scripts

- `npm run prisma:generate` — generate client
- `npm run start:dev` — generate + Nest watch
- `npm run build` / `npm run start:prod` — production

## Demo seed

Idempotent upsert of **`starter`**, **`growth`**, and **`enterprise`** plans (see `src/seed/demo-plans.ts`). Invoke via gateway **`POST /api/billing/seed`** (same auth rules as **`POST /api/auth/seed`**: open in non-production, admin/super_admin JWT in production). Optional JSON body `{ "tenantId": "<uuid>" }` assigns the **starter** plan to that tenant (use the default organization id from auth after **`POST /api/auth/seed`**). NATS: `{ cmd: 'seed_billing_demo' }`.

## NATS

See [docs/messaging.md](../../docs/messaging.md) (`create_plan`, `assign_subscription`, `seed_billing_demo`, etc.).
