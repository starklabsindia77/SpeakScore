# SpeakScore

Multi-tenant AI-driven English speaking assessment MVP. Built with PNPM workspaces, Fastify API, React/Tailwind web, Prisma, Postgres, Redis, and S3-compatible storage.

## Prerequisites
- Node.js 20+
- PNPM 8+
- Docker (for local infra)

## Getting started
```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev # starts API
pnpm dev:web # starts Vite web
```

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
- Prisma schema under `apps/api/prisma/schema.prisma`
- Seed (`pnpm db:seed`) adds demo org and admin user (`admin@demo.com` / `changeme123`) plus question pool.

## Testing
Minimal Vitest placeholders are included; extend as needed.

## Security & multi-tenancy
- JWT auth with role-based guards
- All tenant-owned rows include `orgId` and queries scope by `orgId`
- Candidate links hashed with org-bound tokens
- Private audio stored with signed URLs (S3 compatible)

## Scripts
- `pnpm lint` / `pnpm format`
- `pnpm build` builds packages/apps

## Notes
- AI scoring uses a deterministic stub; integrate providers via `services/scoring.ts`
- Background queues (BullMQ) are stubbed for STT/score jobs; connect workers as needed.
