import { FastifyInstance } from 'fastify';
import { createTestSchema, createAttemptSchema } from '@speakscore/shared';
import { randomUUID, createHash } from 'crypto';
import { addMinutes } from 'date-fns';
import { sql } from 'kysely';

const mapTest = (t: any) => ({
  id: t.id,
  name: t.name,
  isActive: t.is_active,
  createdAt: t.created_at,
  expiresAt: t.expires_at
});

export async function testRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/tests', async (request) => {
    const orgId = request.user!.orgId;
    const userId = request.user!.userId;
    const data = createTestSchema.parse(request.body);
    return request.withTenantDb(async (tenantDb) => {
      const [test] = await tenantDb
        .insertInto('tests')
        .values({
          id: randomUUID(),
          org_id: orgId!,
          name: data.name,
          config_json: data.configJson,
          expires_at: data.expiresAt ? new Date(data.expiresAt) : null,
          is_active: true,
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returningAll()
        .execute();
      return mapTest(test);
    });
  });

  app.get('/tests', async (request) => {
    const orgId = request.user!.orgId;
    return request.withTenantDb((tenantDb) =>
      tenantDb
        .selectFrom('tests')
        .select(['id', 'name', 'is_active', 'created_at', 'expires_at'])
        .where('org_id', '=', orgId!)
        .orderBy('created_at', 'desc')
        .execute()
        .then((rows) => rows.map(mapTest))
    );
  });

  app.get('/tests/:id', async (request, reply) => {
    const orgId = request.user!.orgId!;
    const testId = (request.params as any).id;

    const data = await request.withTenantDb(async (tenantDb) => {
      const test = await tenantDb.selectFrom('tests').selectAll().where('id', '=', testId).where('org_id', '=', orgId).executeTakeFirst();
      if (!test) return null;
      const candidates = await tenantDb
        .selectFrom('candidates')
        .select(['id', 'name', 'email', 'status', 'overall_score', 'decision', 'submitted_at'])
        .where('org_id', '=', orgId)
        .where('test_id', '=', testId)
        .execute();
      const tenantQuestions = await tenantDb.selectFrom('test_questions').selectAll().where('is_active', '=', true).execute();
      const globalQuestions = await sql<{ id: string; type: string; prompt: string; meta_json: any; is_active: boolean; created_at: Date }>`select id, type, prompt, meta_json, is_active, created_at from public.global_question_pool where is_active = true`.execute(tenantDb);
      const questionMap = new Map<string, any>();
      [...tenantQuestions, ...globalQuestions.rows].forEach((q: any) => {
        questionMap.set(q.id, {
          id: q.id,
          orgId: q.org_id ?? null,
          type: q.type,
          prompt: q.prompt,
          metaJson: q.meta_json,
          isActive: q.is_active
        });
      });
      const questions = Array.from(questionMap.values());
      return {
        id: test.id,
        orgId: test.org_id,
        name: test.name,
        configJson: test.config_json,
        isActive: test.is_active,
        expiresAt: test.expires_at,
        createdAt: test.created_at,
        candidates: candidates.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          status: c.status,
          overallScore: c.overall_score,
          decision: c.decision,
          submittedAt: c.submitted_at
        })),
        questions
      };
    });
    if (!data) return reply.notFound('Test not found');
    return data;
  });

  app.post('/tests/:id/links/bulk', async (request, reply) => {
    const orgId = request.user!.orgId!;
    const testId = (request.params as any).id;
    const { candidates } = (request.body as any); // Use schema validation in production

    const results = await request.withTenantDb(async (tenantDb) => {
      const test = await tenantDb.selectFrom('tests').select(['id']).where('id', '=', testId).where('org_id', '=', orgId).executeTakeFirst();
      if (!test) return null;

      const invitationResults = [];
      for (const cand of candidates) {
        const [candidate] = await tenantDb
          .insertInto('candidates')
          .values({
            id: randomUUID(),
            org_id: orgId,
            test_id: testId,
            name: cand.name,
            email: cand.email,
            status: 'INVITED',
            created_at: new Date()
          })
          .returning(['id'])
          .execute();

        const rawToken = randomUUID();
        const token = `${orgId}:${rawToken}`;
        const tokenHash = createHash('sha256').update(token).digest('hex');

        await tenantDb
          .insertInto('candidate_attempts')
          .values({
            id: randomUUID(),
            org_id: orgId,
            test_id: testId,
            candidate_id: candidate.id,
            token_hash: tokenHash,
            expires_at: addMinutes(new Date(), 60),
            created_at: new Date(),
            used_at: null
          })
          .execute();

        invitationResults.push({ name: cand.name, email: cand.email, token });
      }
      return invitationResults;
    });

    if (!results) return reply.notFound('Test missing');
    return { invitations: results };
  });

  app.post('/tests/:id/links', async (request, reply) => {
    const orgId = request.user!.orgId!;
    const testId = (request.params as any).id;
    const data = createAttemptSchema.parse(request.body);
    const result = await request.withTenantDb(async (tenantDb) => {
      const test = await tenantDb.selectFrom('tests').select(['id']).where('id', '=', testId).where('org_id', '=', orgId).executeTakeFirst();
      if (!test) return null;
      const [candidate] = await tenantDb
        .insertInto('candidates')
        .values({
          id: randomUUID(),
          org_id: orgId,
          test_id: testId,
          name: data.candidateName,
          email: data.candidateEmail,
          status: 'INVITED',
          created_at: new Date()
        })
        .returning(['id'])
        .execute();
      const rawToken = randomUUID();
      const token = `${orgId}:${rawToken}`;
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const [attempt] = await tenantDb
        .insertInto('candidate_attempts')
        .values({
          id: randomUUID(),
          org_id: orgId,
          test_id: testId,
          candidate_id: candidate.id,
          token_hash: tokenHash,
          expires_at: addMinutes(new Date(), 60),
          created_at: new Date(),
          used_at: null
        })
        .returning(['id'])
        .execute();
      return { token, attemptId: attempt.id };
    });
    if (!result) return reply.notFound('Test missing');
    return result;
  });

  app.get('/tests/:id/candidates', async (request) => {
    const orgId = request.user!.orgId!;
    const testId = (request.params as any).id;
    return request.withTenantDb((tenantDb) =>
      tenantDb
        .selectFrom('candidates')
        .select(['id', 'name', 'email', 'status', 'overall_score', 'decision', 'submitted_at'])
        .where('org_id', '=', orgId)
        .where('test_id', '=', testId)
        .execute()
        .then((rows) =>
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            status: r.status,
            overallScore: r.overall_score,
            decision: r.decision,
            submittedAt: r.submitted_at
          }))
        )
    );
  });
}
