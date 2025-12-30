# Local Development Setup Guide

## Prerequisites
- ✅ Node.js 20+ (you have v22.16.0)
- ✅ PNPM 8+ (installed)
- Docker Desktop (for Postgres, Redis, Minio)

## Step-by-Step Setup

### 1. Create Environment File

Create `apps/api/.env` file with the following content:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/speakscore
JWT_SECRET=devsecret
PORT=4000
S3_BUCKET=speakscore
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### 2. Start Docker Services

Start the infrastructure services (Postgres, Redis, Minio):

```bash
docker-compose up -d postgres redis minio
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Minio (S3-compatible storage) on ports 9000 and 9001

**Note:** Wait a few seconds for services to be ready before proceeding.

### 3. Run Database Migrations

Set up the database schema:

```bash
pnpm db:migrate:public
```

This creates the shared/public tables.

### 4. Seed the Database

Seed the database with demo data:

```bash
pnpm db:seed
```

This will:
- Create a demo organization
- Create a SUPER_ADMIN user
- Seed initial data

### 5. Start the Development Servers

**Terminal 1 - Start API:**
```bash
pnpm dev
```
API will run on `http://localhost:4000`

**Terminal 2 - Start Web:**
```bash
pnpm dev:web
```
Web will run on `http://localhost:5173`

## Demo Credentials

After seeding, you can login with:

**Demo Organization:**
- Org ID: `00000000-0000-0000-0000-000000000001`
- Email: `admin@demo.com`
- Password: `changeme123`

**Super Admin:**
- Email: `superadmin@speakscore.test`
- Password: `admin123!`
- (Leave Org ID blank on login form)

## Alternative: Run Everything with Docker

If you prefer to run everything in Docker:

```bash
docker-compose up --build
```

This will start all services including the API and Web dev servers.

## Troubleshooting

- **Port conflicts**: Make sure ports 4000, 5173, 5432, 6379, 9000, 9001 are available
- **Database connection errors**: Ensure Docker services are running and ready
- **Migration errors**: Make sure you've run `pnpm db:migrate:public` before seeding

