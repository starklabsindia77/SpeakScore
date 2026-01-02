import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { sql } from 'kysely';
import { assertSafeSchemaName, db, withTenantTransaction } from '../db';
import { migrateTenant } from '../migrations/runner';
import { logger } from '../logger';
import { logPlatformEvent } from './audit';

export class TenantAccessError extends Error {
  code: 'NOT_FOUND' | 'DISABLED' | 'PROVISIONING';
  constructor(message: string, code: 'NOT_FOUND' | 'DISABLED' | 'PROVISIONING') {
    super(message);
    this.code = code;
  }
}

export function normalizeSchemaName(schemaName: string) {
  const cleaned = schemaName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
  const prefix = cleaned.startsWith('tenant_') ? '' : 'tenant_';
  return `${prefix}${cleaned}`;
}

export function schemaFromOrgId(orgId: string) {
  return normalizeSchemaName(`tenant_${orgId.replace(/-/g, '')}`);
}

export async function resolveTenant(orgId: string) {
  const org = await db
    .selectFrom('organizations')
    .select(['id', 'name', 'schema_name', 'status', 'credits_balance', 'feature_costs', 'created_at', 'updated_at'])
    .where('id', '=', orgId)
    .executeTakeFirst();
  if (!org) {
    throw new TenantAccessError('Organization not found', 'NOT_FOUND');
  }
  if (org.status !== 'ACTIVE') {
    const code: TenantAccessError['code'] = org.status === 'DISABLED' ? 'DISABLED' : 'PROVISIONING';
    throw new TenantAccessError('Organization inactive', code);
  }
  return org;
}

export async function ensureOrgSchema(schemaName: string) {
  await sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`).execute(db);
  return schemaName;
}

async function seedTenantDefaults(schemaName: string, orgId: string) {
  const globalQuestions = await db.selectFrom('global_question_pool').selectAll().where('is_active', '=', true).execute();
  if (!globalQuestions.length) return;
  await withTenantTransaction(schemaName, async (tenantDb) => {
    for (const q of globalQuestions) {
      await tenantDb
        .insertInto('test_questions')
        .values({
          id: q.id,
          org_id: orgId,
          type: q.type,
          prompt: q.prompt,
          meta_json: q.meta_json,
          is_active: q.is_active,
          created_at: new Date()
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
    }
  });
}

export async function provisionOrganization(opts: {
  id?: string;
  name: string;
  creditsBalance?: number;
  schemaName?: string;
  adminEmail?: string;
  adminPassword?: string;
  featureCosts?: any;
}) {
  const orgId = opts.id ?? randomUUID();
  const schemaName = normalizeSchemaName(opts.schemaName ?? schemaFromOrgId(orgId));
  assertSafeSchemaName(schemaName);
  const credits = opts.creditsBalance ?? 0;

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('organizations')
      .values({
        id: orgId,
        name: opts.name,
        schema_name: schemaName,
        status: 'PROVISIONING',
        credits_balance: credits,
        feature_costs: opts.featureCosts ? JSON.stringify(opts.featureCosts) : null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .onConflict((oc) => oc.column('id').doUpdateSet({ name: opts.name, schema_name: schemaName, credits_balance: credits, feature_costs: opts.featureCosts ? JSON.stringify(opts.featureCosts) : null, updated_at: new Date() }))
      .execute();
  });

  await ensureOrgSchema(schemaName);
  await migrateTenant(schemaName);

  if (opts.adminEmail && opts.adminPassword) {
    const passwordHash = await bcrypt.hash(opts.adminPassword, 10);
    await withTenantTransaction(schemaName, async (tenantDb) => {
      // Fetch the seeded ORG_ADMIN role ID
      const role = await tenantDb
        .selectFrom('custom_roles')
        .select('id')
        .where('name', '=', 'ORG_ADMIN')
        .executeTakeFirst();

      await tenantDb
        .insertInto('users')
        .values({
          id: randomUUID(),
          org_id: orgId,
          email: opts.adminEmail!,
          password_hash: passwordHash,
          role: 'ORG_ADMIN',
          custom_role_id: role?.id,
          token_version: 1,
          created_at: new Date(),
          updated_at: new Date()
        })
        .onConflict((oc) => oc.column('email').doNothing())
        .execute();
    });
  }

  await seedTenantDefaults(schemaName, orgId);

  await db
    .updateTable('organizations')
    .set({ status: 'ACTIVE', updated_at: new Date() })
    .where('id', '=', orgId)
    .execute();

  const updated = await resolveTenant(orgId);
  logger.info({ orgId, schema: schemaName }, 'Provisioned organization');
  await logPlatformEvent({
    level: 'INFO',
    source: 'SYSTEM',
    message: 'Organization provisioned',
    orgId,
    meta: { schemaName, credits },
    actorAdminId: null
  });
  return updated;
}
