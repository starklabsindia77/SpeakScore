import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { env } from './env';
import { Database } from './db/types';
import { logger } from './logger';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10
});

pool.on('error', (err) => {
  logger.error({ err }, 'Database pool error');
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool })
});

export type TenantContext = { orgId: string; schemaName: string };

const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`;
const schemaPattern = /^[a-z0-9_]+$/;

export function assertSafeSchemaName(schemaName: string) {
  if (!schemaPattern.test(schemaName)) {
    throw new Error('Invalid schema name');
  }
}

export async function withTenantTransaction<T>(schemaName: string, fn: (tenantDb: Kysely<Database>) => Promise<T>) {
  assertSafeSchemaName(schemaName);
  return db.transaction().execute(async (trx) => {
    await trx.execute(sql.raw(`set local search_path to ${quoteIdent(schemaName)}, public`));
    return fn(trx as unknown as Kysely<Database>);
  });
}

export async function closeDb() {
  await db.destroy();
  await pool.end();
}
