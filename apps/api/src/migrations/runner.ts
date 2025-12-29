import fs from 'fs';
import path from 'path';
import { sql } from 'kysely';
import { assertSafeSchemaName, db, withTenantTransaction } from '../db';
import { logger } from '../logger';

const baseDir = path.join(__dirname, '../../migrations');
const publicDir = path.join(baseDir, 'public');
const tenantDir = path.join(baseDir, 'tenant');

const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`;

function readMigrations(dir: string) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({ file, sql: fs.readFileSync(path.join(dir, file), 'utf8') }));
}

async function ensurePublicMigrationTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS public.schema_migrations_public (
      name text primary key,
      run_at timestamptz not null default now()
    )
  `);
}

async function ensureTenantMigrationTable(schemaName: string) {
  assertSafeSchemaName(schemaName);
  await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schemaName)}`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS ${quoteIdent(schemaName)}.schema_migrations_tenant (name text primary key, run_at timestamptz not null default now())`));
}

async function appliedForTenant(schemaName: string) {
  assertSafeSchemaName(schemaName);
  const result = await db.executeQuery<{ name: string }>({
    sql: `select name from ${quoteIdent(schemaName)}.schema_migrations_tenant`,
    parameters: []
  });
  return new Set(result.rows.map((r) => r.name));
}

async function appliedForPublic() {
  const rows = await db.selectFrom('schema_migrations_public').select('name').execute();
  return new Set(rows.map((r) => r.name));
}

export async function migratePublic() {
  logger.info('Running public migrations');
  await ensurePublicMigrationTable();
  const applied = await appliedForPublic();
  const migrations = readMigrations(publicDir);
  for (const migration of migrations) {
    if (applied.has(migration.file)) continue;
    await db.transaction().execute(async (trx) => {
      await trx.execute(sql`set local search_path to public`);
      await trx.execute(sql.raw(migration.sql));
      await trx.insertInto('schema_migrations_public').values({ name: migration.file, run_at: new Date() }).execute();
    });
    logger.info({ migration: migration.file }, 'Applied public migration');
  }
}

export async function migrateTenant(schemaName: string) {
  assertSafeSchemaName(schemaName);
  logger.info({ schema: schemaName }, 'Running tenant migrations');
  await ensureTenantMigrationTable(schemaName);
  const applied = await appliedForTenant(schemaName);
  const migrations = readMigrations(tenantDir);
  for (const migration of migrations) {
    if (applied.has(migration.file)) continue;
    await withTenantTransaction(schemaName, async (tenantDb) => {
      await tenantDb.execute(sql.raw(migration.sql));
      await tenantDb.insertInto('schema_migrations_tenant').values({ name: migration.file, run_at: new Date() }).execute();
    });
    logger.info({ schema: schemaName, migration: migration.file }, 'Applied tenant migration');
  }
}

export async function migrateAllTenants() {
  const orgs = await db.selectFrom('organizations').select(['schema_name']).where('status', '=', 'active').execute();
  for (const org of orgs) {
    await migrateTenant(org.schema_name);
  }
}
