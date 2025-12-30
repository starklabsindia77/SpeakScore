# Running SpeakScore Without Docker

This guide will help you set up and run SpeakScore using locally installed services instead of Docker.

## Prerequisites

You'll need to install these services locally:
1. **PostgreSQL 15+** (Required)
2. **Redis 7+** (Required for job queues)
3. **Minio** (Required for S3-compatible storage) OR use a cloud S3 service

## Step 1: Install PostgreSQL

### Windows (using installer)
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and complete the setup
3. Remember the password you set for the `postgres` user
4. PostgreSQL will run on port `5432` by default

### Verify installation
```bash
psql --version
```

## Step 2: Create Database

Open PostgreSQL command line or pgAdmin and run:

```sql
CREATE DATABASE speakscore;
```

Or using command line:
```bash
psql -U postgres -c "CREATE DATABASE speakscore;"
```

## Step 3: Install Redis

### Windows (using WSL or installer)
**Option A: Using WSL (Recommended)**
```bash
wsl
sudo apt update
sudo apt install redis-server
redis-server
```

**Option B: Using Windows installer**
1. Download Redis for Windows from https://github.com/microsoftarchive/redis/releases
2. Or use Chocolatey: `choco install redis-64`
3. Start Redis: `redis-server`

Redis will run on port `6379` by default.

### Verify installation
```bash
redis-cli ping
# Should return: PONG
```

## Step 4: Install Minio (S3-compatible storage)

### Windows
**Option A: Using executable**
1. Download Minio from https://min.io/download
2. Extract and run:
```bash
minio.exe server C:\minio-data
```

**Option B: Using Chocolatey**
```bash
choco install minio
minio server C:\minio-data
```

Minio will run on:
- API: `http://localhost:9000`
- Console: `http://localhost:9001`

**First-time setup:**
1. Open `http://localhost:9001` in your browser
2. Login with default credentials: `minio` / `minio123`
3. Create a bucket named `speakscore`

**Option C: Use Cloud S3 (AWS, DigitalOcean Spaces, etc.)**
If you prefer using a cloud S3 service, you can skip Minio and configure your cloud S3 credentials in the `.env` file.

## Step 5: Create Environment File

Create `apps/api/.env` file with the following content:

```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/speakscore
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

**Important:** Replace `YOUR_POSTGRES_PASSWORD` with the actual password you set during PostgreSQL installation.

**If using cloud S3 instead of Minio:**
```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/speakscore
JWT_SECRET=devsecret
PORT=4000
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://your-s3-endpoint.com
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

## Step 6: Install Dependencies

```bash
pnpm install
```

## Step 7: Run Database Migrations

```bash
pnpm db:migrate:public
```

This creates the shared/public tables.

## Step 8: Seed the Database

```bash
pnpm db:seed
```

This will:
- Create a demo organization
- Create a SUPER_ADMIN user
- Seed initial data

## Step 9: Start Services

Make sure all services are running:
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)
- ✅ Minio (ports 9000, 9001) - if using local Minio

## Step 10: Start Development Servers

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

## Troubleshooting

### PostgreSQL Connection Issues
- Verify PostgreSQL is running: Check Windows Services or run `pg_isready`
- Check if port 5432 is available: `netstat -an | findstr 5432`
- Verify database exists: `psql -U postgres -l`

### Redis Connection Issues
- Verify Redis is running: `redis-cli ping`
- Check if port 6379 is available: `netstat -an | findstr 6379`
- If using WSL, make sure Redis is accessible from Windows

### Minio/S3 Issues
- Verify Minio is running: Check `http://localhost:9001`
- Ensure the bucket `speakscore` exists
- Check Minio console for any errors
- If using cloud S3, verify credentials and endpoint

### Port Conflicts
Make sure these ports are available:
- `4000` - API
- `5173` - Web
- `5432` - PostgreSQL
- `6379` - Redis
- `9000` - Minio API
- `9001` - Minio Console

## Alternative: Using Cloud Services

Instead of running services locally, you can use:
- **PostgreSQL**: AWS RDS, DigitalOcean Managed Database, Supabase, etc.
- **Redis**: AWS ElastiCache, Redis Cloud, Upstash, etc.
- **S3**: AWS S3, DigitalOcean Spaces, Cloudflare R2, etc.

Just update your `.env` file with the appropriate connection strings and credentials.

