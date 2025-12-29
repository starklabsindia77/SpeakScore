# SpeakScore

Multi-tenant AI-driven English speaking assessment MVP. Built with PNPM workspaces, Fastify API, React/Tailwind web, Kysely/pg, Postgres, Redis, and S3-compatible storage.

## Prerequisites
- Node.js 20+
- PNPM 8+
- Docker (for local infra)

## Getting started
```bash
pnpm install
pnpm db:migrate:public   # sets up shared tables
pnpm db:seed             # provisions demo org + seeds tenants
pnpm dev # starts API
pnpm dev:web # starts Vite web
```
- Demo login: org ID `00000000-0000-0000-0000-000000000001`, email `admin@demo.com`, password `changeme123`.

API runs on `http://localhost:4000`, web on `http://localhost:5173`.

## Environment variables
Create `apps/api/.env` (or root `.env`) with:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/speakscore
JWT_SECRET=devsecret
PORT=4000
S3_BUCKET=speakscore
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
REDIS_URL=redis://localhost:6379
```

Web can point to API via `VITE_API_URL`.

## Docker compose
```bash
docker-compose up --build
```
Brings up Postgres, Redis, Minio, API, and Web (dev servers).

## Database & seed
- Public migrations live in `apps/api/migrations/public`, tenant migrations in `apps/api/migrations/tenant`.
- Commands:
  - `pnpm db:migrate:public` (once per database)
  - `pnpm db:migrate:tenant --schema=<schema>` (single tenant)
  - `pnpm db:migrate:all-tenants` (applies tenant migrations to every active org)
- Seed (`pnpm db:seed`) runs public migrations, provisions the demo org (`admin@demo.com` / `changeme123`), seeds global question pool, and creates a SUPER_ADMIN (`superadmin@speakscore.test` / `admin123!`).

## Testing
Minimal Vitest placeholders are included; extend as needed.

## Security & multi-tenancy
- Schema-per-tenant Postgres: shared admin tables live in `public`, tenant data lives in `tenant_<orgId>` schemas.
- Requests run inside a per-request transaction with `SET LOCAL search_path TO <tenant_schema>, public` to avoid leakage.
- JWT auth with role-based guards; tenant requests require `orgId` in the token (validated against `public.organizations`).
- Candidate links are org-bound tokens; the backend resolves the org and routes to the correct schema before running queries.
- Private audio stored with signed URLs (S3 compatible)

## Provisioning a new organization
- As a SUPER_ADMIN, call `POST /api/admin/orgs` with `{ name, creditsBalance?, schemaName?, adminEmail?, adminPassword? }`.
- The API will create the org row in `public.organizations`, create the tenant schema, run tenant migrations, and seed default data/users.
- Alternatively, run `pnpm db:migrate:tenant --schema=tenant_<orgId>` after adding an org row manually to public tables.

## Scripts
- `pnpm lint` / `pnpm format`
- `pnpm build` builds packages/apps

## Notes
- AI scoring uses a deterministic stub; integrate providers via `services/scoring.ts`
- Background queues (BullMQ) are stubbed for STT/score jobs; connect workers as needed.
