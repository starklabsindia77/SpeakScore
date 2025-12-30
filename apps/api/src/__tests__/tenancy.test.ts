import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID, createHash } from 'crypto';
import { sql } from 'kysely';
import { db, withTenantTransaction, closeDb } from '../db';
import { migratePublic } from '../migrations/runner';
import { provisionOrganization, schemaFromOrgId } from '../services/tenancy';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('schema-per-tenant isolation', () => {
  const orgA = { id: randomUUID(), name: 'Tenant A', schema: '' };
  const orgB = { id: randomUUID(), name: 'Tenant B', schema: '' };
  const testIds = { a: '', b: '' };
  const candidateIds = { a: '', b: '' };

  beforeAll(async () => {
    await migratePublic();
    const createdA = await provisionOrganization({ id: orgA.id, name: orgA.name, schemaName: schemaFromOrgId(orgA.id), creditsBalance: 2 });
    const createdB = await provisionOrganization({ id: orgB.id, name: orgB.name, schemaName: schemaFromOrgId(orgB.id), creditsBalance: 2 });
    orgA.schema = createdA.schema_name;
    orgB.schema = createdB.schema_name;

    await withTenantTransaction(orgA.schema, async (tenantDb) => {
      testIds.a = randomUUID();
      await tenantDb
        .insertInto('tests')
        .values({
          id: testIds.a,
          org_id: orgA.id,
          name: 'Test A',
          config_json: { sections: [] },
          expires_at: null,
          is_active: true,
          created_by: randomUUID(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();

      await tenantDb
        .insertInto('users')
        .values({ id: randomUUID(), org_id: orgA.id, email: 'a@example.com', password_hash: 'x', role: 'ORG_ADMIN', created_at: new Date(), updated_at: new Date() })
        .execute();
      candidateIds.a = randomUUID();
      await tenantDb
        .insertInto('candidates')
        .values({
          id: candidateIds.a,
          org_id: orgA.id,
          test_id: testIds.a,
          name: 'Alice',
          email: 'alice@example.com',
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
    });

    await withTenantTransaction(orgB.schema, async (tenantDb) => {
      testIds.b = randomUUID();
      await tenantDb
        .insertInto('tests')
        .values({
          id: testIds.b,
          org_id: orgB.id,
          name: 'Test B',
          config_json: { sections: [] },
          expires_at: null,
          is_active: true,
          created_by: randomUUID(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();

      await tenantDb
        .insertInto('users')
        .values({ id: randomUUID(), org_id: orgB.id, email: 'b@example.com', password_hash: 'x', role: 'ORG_ADMIN', created_at: new Date(), updated_at: new Date() })
        .execute();
      candidateIds.b = randomUUID();
      await tenantDb
        .insertInto('candidates')
        .values({
          id: candidateIds.b,
          org_id: orgB.id,
          test_id: testIds.b,
          name: 'Bob',
          email: 'bob@example.com',
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
    });
  });

  afterAll(async () => {
    await sql.raw(`DROP SCHEMA IF EXISTS "${orgA.schema}" CASCADE`).execute(db);
    await sql.raw(`DROP SCHEMA IF EXISTS "${orgB.schema}" CASCADE`).execute(db);
    await db.deleteFrom('organizations').where('id', '=', orgA.id).execute();
    await db.deleteFrom('organizations').where('id', '=', orgB.id).execute();
    await closeDb();
  });

  it('sets search_path per tenant and isolates data', async () => {
    const schema = await withTenantTransaction(orgA.schema, async (tenantDb) => {
      const res = await sql`select current_schema() as current`.execute(tenantDb);
      return (res.rows[0] as any).current as string;
    });
    expect(schema).toBe(orgA.schema);

    const countA = await withTenantTransaction(orgA.schema, (tenantDb) => tenantDb.selectFrom('candidates').select(({ fn }) => fn.countAll().as('count')).executeTakeFirst());
    const countB = await withTenantTransaction(orgB.schema, (tenantDb) => tenantDb.selectFrom('candidates').select(({ fn }) => fn.countAll().as('count')).executeTakeFirst());
    expect(Number(countA?.count)).toBe(1);
    expect(Number(countB?.count)).toBe(1);

    const cross = await withTenantTransaction(orgA.schema, (tenantDb) => tenantDb.selectFrom('candidates').select('id').where('org_id', '=', orgB.id).execute());
    expect(cross.length).toBe(0);
  });

  it('resets search_path between requests', async () => {
    const defaultSchema = await sql`select current_schema() as current`.execute(db);
    expect((defaultSchema.rows[0] as any).current).toBe('public');

    const schemaB = await withTenantTransaction(orgB.schema, async (tenantDb) => {
      const res = await sql`select current_schema() as current`.execute(tenantDb);
      return (res.rows[0] as any).current as string;
    });
    expect(schemaB).toBe(orgB.schema);

    const after = await sql`select current_schema() as current`.execute(db);
    expect((after.rows[0] as any).current).toBe('public');
  });

  it('routes tokens to correct tenant schema', async () => {
    const rawToken = randomUUID();
    const tokenHash = createHash('sha256').update(`${orgA.id}:${rawToken}`).digest('hex');
    const attemptId = randomUUID();
    const candidateId = candidateIds.a;
    await withTenantTransaction(orgA.schema, async (tenantDb) => {
      await tenantDb
        .insertInto('candidate_attempts')
        .values({
          id: attemptId,
          org_id: orgA.id,
          test_id: testIds.a,
          candidate_id: candidateId,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 60_000),
          created_at: new Date(),
          used_at: null
        })
        .execute();
    });

    const foundInA = await withTenantTransaction(orgA.schema, (tenantDb) =>
      tenantDb.selectFrom('candidate_attempts').select('id').where('token_hash', '=', tokenHash).executeTakeFirst()
    );
    expect(foundInA?.id).toBe(attemptId);

    const foundInB = await withTenantTransaction(orgB.schema, (tenantDb) =>
      tenantDb.selectFrom('candidate_attempts').select('id').where('token_hash', '=', tokenHash).executeTakeFirst()
    );
    expect(foundInB).toBeUndefined();
  });

  it('handles concurrent requests without leakage', async () => {
    const [schemaA, schemaB] = await Promise.all([
      withTenantTransaction(orgA.schema, async (tenantDb) => {
        await tenantDb.insertInto('audit_logs').values({ id: randomUUID(), org_id: orgA.id, actor_user_id: null, action: 'ping', meta_json: null, created_at: new Date() }).execute();
        const res = await sql`select current_schema() as current`.execute(tenantDb);
        return (res.rows[0] as any).current as string;
      }),
      withTenantTransaction(orgB.schema, async (tenantDb) => {
        await tenantDb.insertInto('audit_logs').values({ id: randomUUID(), org_id: orgB.id, actor_user_id: null, action: 'ping', meta_json: null, created_at: new Date() }).execute();
        const res = await sql`select current_schema() as current`.execute(tenantDb);
        return (res.rows[0] as any).current as string;
      })
    ]);

    expect(schemaA).toBe(orgA.schema);
    expect(schemaB).toBe(orgB.schema);
  });
});
