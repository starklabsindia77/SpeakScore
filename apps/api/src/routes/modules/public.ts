import { FastifyInstance } from 'fastify';
import { candidateResponseSchema, submitAttemptSchema } from '@speakscore/shared';
import { createHash, randomUUID } from 'crypto';
import { sql } from 'kysely';
import { withTenantTransaction } from '../../db';
import { resolveTenant, TenantAccessError } from '../../services/tenancy';
import { createSignedUploadUrl } from '../../services/storage';
import { simpleScoreFromTranscript } from '../../services/scoring';

function parseToken(rawToken: string) {
  const [orgId, tokenBody] = rawToken.split(':');
  if (!orgId || !tokenBody) throw new Error('Invalid token');
  return { orgId, tokenBody };
}

async function findAttempt(rawToken: string) {
  const { orgId, tokenBody } = parseToken(rawToken);
  const org = await resolveTenant(orgId);
  const tokenHash = createHash('sha256').update(`${orgId}:${tokenBody}`).digest('hex');
  const attempt = await withTenantTransaction(org.schema_name, async (tenantDb) =>
    tenantDb
      .selectFrom('candidate_attempts')
      .innerJoin('candidates', 'candidates.id', 'candidate_attempts.candidate_id')
      .innerJoin('tests', 'tests.id', 'candidate_attempts.test_id')
      .select([
        'candidate_attempts.id as attempt_id',
        'candidate_attempts.expires_at as expires_at',
        'candidate_attempts.candidate_id as candidate_id',
        'candidate_attempts.test_id as test_id',
        'candidate_attempts.org_id as org_id',
        'candidates.name as candidate_name',
        'candidates.email as candidate_email',
        'candidates.status as candidate_status',
        'tests.name as test_name',
        'tests.config_json as config_json'
      ])
      .where('candidate_attempts.org_id', '=', orgId)
      .where('candidate_attempts.token_hash', '=', tokenHash)
      .executeTakeFirst()
  );
  return { attempt, org };
}

async function loadQuestions(schemaName: string) {
  return withTenantTransaction(schemaName, async (tenantDb) => {
    const tenantQuestions = await tenantDb.selectFrom('test_questions').selectAll().where('is_active', '=', true).execute();
    const globalQuestions = await sql<{ id: string; type: string; prompt: string; meta_json: any; is_active: boolean; created_at: Date }>`select id, type, prompt, meta_json, is_active, created_at from public.global_question_pool where is_active = true`.execute(tenantDb);
    const combined = new Map<string, any>();
    [...tenantQuestions, ...globalQuestions.rows].forEach((q: any) => {
      combined.set(q.id, {
        id: q.id,
        orgId: q.org_id ?? null,
        type: q.type,
        prompt: q.prompt,
        metaJson: q.meta_json,
        isActive: q.is_active
      });
    });
    return Array.from(combined.values());
  });
}

export async function publicRoutes(app: FastifyInstance) {
  app.get('/attempt/:token', async (request, reply) => {
    const token = (request.params as any).token as string;
    let found;
    try {
      found = await findAttempt(token);
    } catch (e) {
      if (e instanceof TenantAccessError && e.code === 'DISABLED') return reply.forbidden('Organization disabled');
      return reply.badRequest('Invalid token');
    }
    const { attempt, org } = found;
    if (!attempt) return reply.notFound('Attempt not found');
    if (attempt.expires_at < new Date()) return reply.badRequest('Link expired');
    const questions = await loadQuestions(org.schema_name);
    return {
      attemptId: attempt.attempt_id,
      candidate: { id: attempt.candidate_id, name: attempt.candidate_name, email: attempt.candidate_email, status: attempt.candidate_status },
      test: { id: attempt.test_id, name: attempt.test_name, configJson: attempt.config_json },
      questions
    };
  });

  app.post('/attempt/:token/start', async (request, reply) => {
    const token = (request.params as any).token as string;
    let attemptBundle;
    try {
      attemptBundle = await findAttempt(token);
    } catch (e) {
      if (e instanceof TenantAccessError && e.code === 'DISABLED') return reply.forbidden('Organization disabled');
      return reply.badRequest('Invalid token');
    }
    const { attempt, org } = attemptBundle;
    if (!attempt) return reply.notFound('Attempt not found');
    if (attempt.expires_at < new Date()) return reply.badRequest('Link expired');
    await withTenantTransaction(org.schema_name, async (tenantDb) => {
      await tenantDb
        .updateTable('candidates')
        .set({ status: 'STARTED', started_at: new Date() })
        .where('id', '=', attempt.candidate_id)
        .where('org_id', '=', org.id)
        .execute();
      await tenantDb.updateTable('candidate_attempts').set({ used_at: new Date() }).where('id', '=', attempt.attempt_id).execute();
    });
    return reply.send({ ok: true });
  });

  app.post('/attempt/:token/response', async (request, reply) => {
    const token = (request.params as any).token as string;
    let attemptBundle;
    try {
      attemptBundle = await findAttempt(token);
    } catch (e) {
      if (e instanceof TenantAccessError && e.code === 'DISABLED') return reply.forbidden('Organization disabled');
      return reply.badRequest('Invalid token');
    }
    const { attempt, org } = attemptBundle;
    if (!attempt) return reply.notFound('Attempt not found');
    if (attempt.expires_at < new Date()) return reply.badRequest('Link expired');
    const body = candidateResponseSchema.parse(request.body);
    const uploadUrl = await createSignedUploadUrl(body.audioObjectKey, 'audio/webm');
    await withTenantTransaction(org.schema_name, async (tenantDb) => {
      await tenantDb
        .insertInto('responses')
        .values({
          id: randomUUID(),
          org_id: org.id,
          attempt_id: attempt.attempt_id,
          candidate_id: attempt.candidate_id,
          question_id: body.questionId,
          audio_object_key: body.audioObjectKey,
          created_at: new Date(),
          updated_at: new Date(),
          transcript: null,
          scores_json: null,
          confidence: null,
          relevance_score: null,
          flagged_reason: null,
          flagged_at: null
        })
        .execute();
    });
    return { uploadUrl };
  });

  app.post('/attempt/:token/submit', async (request, reply) => {
    const token = (request.params as any).token as string;
    let attemptBundle;
    try {
      attemptBundle = await findAttempt(token);
    } catch (e) {
      if (e instanceof TenantAccessError && e.code === 'DISABLED') return reply.forbidden('Organization disabled');
      return reply.badRequest('Invalid token');
    }
    const { attempt, org } = attemptBundle;
    if (!attempt) return reply.notFound('Attempt not found');
    if (attempt.expires_at < new Date()) return reply.badRequest('Link expired');
    submitAttemptSchema.parse(request.body);
    const { overallScore, decision, flaggedCount } = await withTenantTransaction(org.schema_name, async (tenantDb) => {
      const responses = await tenantDb.selectFrom('responses').selectAll().where('attempt_id', '=', attempt.attempt_id).execute();
      let totalScore = 0;
      let flaggedCountInner = 0;
      for (const resp of responses) {
        const { overall, scores, feedback, confidence, relevance, flagged, flaggedReason } = simpleScoreFromTranscript(resp.transcript ?? '');
        await tenantDb
          .updateTable('responses')
          .set({
            scores_json: { ...scores, feedback },
            confidence,
            relevance_score: relevance,
            flagged_reason: flagged ? flaggedReason : null,
            flagged_at: flagged ? new Date() : null,
            updated_at: new Date()
          })
          .where('id', '=', resp.id)
          .execute();
        if (flagged) flaggedCountInner += 1;
        totalScore += overall;
      }
      const overallScore = responses.length ? Math.round(totalScore / responses.length) : 0;
      const decision = overallScore >= 70 ? 'PASS' : overallScore >= 55 ? 'BORDERLINE' : 'FAIL';
      const status = flaggedCountInner > 0 ? 'SUBMITTED' : 'SCORED';

      const existing = await tenantDb.selectFrom('credit_usage').select('id').where('attempt_id', '=', attempt.attempt_id).executeTakeFirst();
      if (!existing) {
        await tenantDb
          .insertInto('credit_usage')
          .values({
            id: randomUUID(),
            org_id: org.id,
            attempt_id: attempt.attempt_id,
            candidate_id: attempt.candidate_id,
            credits_used: 1,
            used_at: new Date()
          })
          .execute();
        await sql`update public.organizations set credits_balance = credits_balance - 1, updated_at = now() where id = ${org.id}`.execute(tenantDb);
      }

      await tenantDb
        .updateTable('candidates')
        .set({ status, submitted_at: new Date(), scored_at: new Date(), overall_score: overallScore, decision })
        .where('id', '=', attempt.candidate_id)
        .where('org_id', '=', org.id)
        .execute();

      return { overallScore, decision, flaggedCount: flaggedCountInner };
    });
    return reply.send({ overallScore, decision, flaggedCount });
  });
}
