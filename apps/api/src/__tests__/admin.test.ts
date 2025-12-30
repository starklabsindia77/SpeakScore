import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { sql } from 'kysely';
import { migratePublic } from '../migrations/runner';
import { db, withTenantTransaction, closeDb } from '../db';
import { provisionOrganization, schemaFromOrgId } from '../services/tenancy';
import { buildServer } from '../server';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('admin panel RBAC and actions', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  const superAdminId = randomUUID();
  const superEmail = `super+${Date.now()}@test.com`;
  const orgId = randomUUID();
  let orgSchema = '';
  const tenantUserEmail = `orgadmin+${Date.now()}@test.com`;
  const tenantPassword = 'pass12345!';
  let attemptToken = '';

  beforeAll(async () => {
    await migratePublic();
    app = await buildServer();
    await app.ready();

    const adminPassword = await bcrypt.hash('admin123!', 10);
    await db
      .insertInto('platform_admins')
      .values({
        id: superAdminId,
        email: superEmail,
        password_hash: adminPassword,
        role: 'SUPER_ADMIN',
        created_at: new Date()
      })
      .onConflict((oc) => oc.column('email').doNothing())
      .execute();

    const org = await provisionOrganization({ id: orgId, name: 'Admin Test Org', schemaName: schemaFromOrgId(orgId), creditsBalance: 3 });
    orgSchema = org.schema_name;

    await withTenantTransaction(orgSchema, async (tenantDb) => {
      const tenantPasswordHash = await bcrypt.hash(tenantPassword, 10);
      const testId = randomUUID();
      const candidateId = randomUUID();
      await tenantDb
        .insertInto('users')
        .values({
          id: randomUUID(),
          org_id: orgId,
          email: tenantUserEmail,
          password_hash: tenantPasswordHash,
          role: 'ORG_ADMIN',
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();
      await tenantDb
        .insertInto('tests')
        .values({
          id: testId,
          org_id: orgId,
          name: 'Sample',
          config_json: { sections: [] },
          expires_at: null,
          is_active: true,
          created_by: randomUUID(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();
      await tenantDb
        .insertInto('candidates')
        .values({
          id: candidateId,
          org_id: orgId,
          test_id: testId,
          name: 'Candidate',
          email: 'candidate@example.com',
          status: 'INVITED',
          overall_score: null,
          decision: null,
          created_at: new Date(),
          phone: null,
          started_at: null,
          submitted_at: null,
          scored_at: null
        })
        .execute();
      const rawToken = randomUUID();
      attemptToken = `${orgId}:${rawToken}`;
      const tokenHash = createHash('sha256').update(`${orgId}:${rawToken}`).digest('hex');
      await tenantDb
        .insertInto('candidate_attempts')
        .values({
          id: randomUUID(),
          org_id: orgId,
          test_id: testId,
          candidate_id: candidateId,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 60_000),
          used_at: null,
          created_at: new Date()
        })
        .execute();
    });
  });

  afterAll(async () => {
    await sql.raw(`DROP SCHEMA IF EXISTS "${orgSchema}" CASCADE`).execute(db);
    await db.deleteFrom('organizations').where('id', '=', orgId).execute();
    await db.deleteFrom('platform_admins').where('id', '=', superAdminId).execute();
    await app.close();
    await closeDb();
  });

  it('rejects non super admin on admin APIs', async () => {
    const orgToken = app.jwt.sign({ userId: randomUUID(), orgId, role: 'ORG_ADMIN' as const });
    const res = await app.inject({ method: 'GET', url: '/api/admin/orgs', headers: { authorization: `Bearer ${orgToken}` } });
    expect(res.statusCode).toBe(403);
  });

  it('allocates credits via admin endpoint and records audit', async () => {
    const superToken = app.jwt.sign({ userId: superAdminId, role: 'SUPER_ADMIN' as const });
    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/orgs/${orgId}/credits`,
      payload: { credits: 5, note: 'test top-up' },
      headers: { authorization: `Bearer ${superToken}` }
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.creditsBalance).toBe(8);
    const log = await db
      .selectFrom('audit_logs_platform')
      .select(['message', 'org_id'])
      .where('org_id', '=', orgId)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
    expect(log?.message).toContain('Credits');
  });

  it('prevents disabled org from login or candidate start', async () => {
    const superToken = app.jwt.sign({ userId: superAdminId, role: 'SUPER_ADMIN' as const });
    const disableRes = await app.inject({
      method: 'PATCH',
      url: `/api/admin/orgs/${orgId}/status`,
      headers: { authorization: `Bearer ${superToken}` },
      payload: { status: 'DISABLED' }
    });
    expect(disableRes.statusCode).toBe(200);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: tenantUserEmail, password: tenantPassword, orgId }
    });
    expect(loginRes.statusCode).toBe(403);

    const startRes = await app.inject({ method: 'POST', url: `/public/attempt/${attemptToken}/start` });
    expect(startRes.statusCode).toBe(403);

    await app.inject({
      method: 'PATCH',
      url: `/api/admin/orgs/${orgId}/status`,
      headers: { authorization: `Bearer ${superToken}` },
      payload: { status: 'ACTIVE' }
    });
  });

  it('logs endpoint returns entries', async () => {
    const superToken = app.jwt.sign({ userId: superAdminId, role: 'SUPER_ADMIN' as const });
    const res = await app.inject({ method: 'GET', url: '/api/admin/logs?limit=10', headers: { authorization: `Bearer ${superToken}` } });
    expect(res.statusCode).toBe(200);
    const list = res.json() as any[];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });
});
