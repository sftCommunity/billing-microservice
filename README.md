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

## NATS

See [docs/messaging.md](../../docs/messaging.md) (`create_plan`, `assign_subscription`, etc.).
