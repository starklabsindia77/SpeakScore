import { FastifyInstance } from 'fastify';
import { Parser } from 'json2csv';
import { createSignedReadUrl } from '../../services/storage';

export async function candidateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/candidates', async (request) => {
    const orgId = request.user!.orgId;
    return request
      .withTenantDb((tenantDb) =>
        tenantDb
          .selectFrom('candidates')
          .select([
            'id',
            'name',
            'email',
            'status',
            'overall_score',
            'decision',
            'submitted_at',
            'scored_at',
            'created_at',
            'test_id'
          ])
          .where('org_id', '=', orgId!)
          .orderBy('created_at', 'desc')
          .execute()
      )
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          status: r.status,
          overallScore: r.overall_score,
          decision: r.decision,
          submittedAt: r.submitted_at,
          scoredAt: r.scored_at,
          createdAt: r.created_at,
          testId: r.test_id
        }))
      );
  });

  app.get('/candidates/export.csv', async (request, reply) => {
    const orgId = request.user!.orgId;
    const records = await request.withTenantDb((tenantDb) =>
      tenantDb
        .selectFrom('candidates')
        .select(['name', 'email', 'status', 'overall_score', 'decision', 'submitted_at'])
        .where('org_id', '=', orgId!)
        .execute()
    );
    const parser = new Parser();
    const csv = parser.parse(
      records.map((r) => ({
        name: r.name,
        email: r.email,
        status: r.status,
        overallScore: r.overall_score,
        decision: r.decision,
        submittedAt: r.submitted_at
      }))
    );
    reply.header('Content-Type', 'text/csv');
    reply.send(csv);
  });

  app.get('/candidates/:id', async (request, reply) => {
    const orgId = request.user!.orgId;
    const id = (request.params as any).id;
    const { candidate, responses } = await request.withTenantDb(async (tenantDb) => {
      const candidateRow = await tenantDb.selectFrom('candidates').selectAll().where('id', '=', id).where('org_id', '=', orgId!).executeTakeFirst();
      if (!candidateRow) return { candidate: null, responses: [] as any[] };
      const respRows = await tenantDb
        .selectFrom('responses')
        .leftJoin('test_questions', 'test_questions.id', 'responses.question_id')
        .select([
          'responses.id as id',
          'responses.audio_object_key as audio_object_key',
          'responses.scores_json as scores_json',
          'responses.confidence as confidence',
          'responses.relevance_score as relevance_score',
          'responses.flagged_reason as flagged_reason',
          'responses.flagged_at as flagged_at',
          'responses.created_at as created_at',
          'responses.updated_at as updated_at',
          'responses.question_id as question_id',
          'test_questions.prompt as prompt',
          'test_questions.type as type'
        ])
        .where('responses.candidate_id', '=', id)
        .where('responses.org_id', '=', orgId!)
        .execute();
      return { candidate: candidateRow, responses: respRows };
    });
    if (!candidate) return reply.notFound('Candidate not found');
    const enriched = await Promise.all(
      responses.map(async (r) => ({
        id: r.id,
        audioObjectKey: r.audio_object_key,
        scoresJson: r.scores_json,
        confidence: r.confidence,
        relevanceScore: r.relevance_score,
        flaggedReason: r.flagged_reason,
        flaggedAt: r.flagged_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        questionId: r.question_id,
        question: r.prompt
          ? {
              prompt: r.prompt,
              type: r.type
            }
          : null,
        signedUrl: await createSignedReadUrl(r.audio_object_key)
      }))
    );
    return {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status,
        overallScore: candidate.overall_score,
        decision: candidate.decision,
        submittedAt: candidate.submitted_at,
        scoredAt: candidate.scored_at,
        createdAt: candidate.created_at
      },
      responses: enriched
    };
  });

  app.get('/candidates/review/flags', async (request) => {
    const orgId = request.user!.orgId;
    const flagged = await request.withTenantDb((tenantDb) =>
      tenantDb
        .selectFrom('responses')
        .innerJoin('candidates', 'candidates.id', 'responses.candidate_id')
        .leftJoin('test_questions', 'test_questions.id', 'responses.question_id')
        .select([
          'responses.id as id',
          'responses.audio_object_key as audio_object_key',
          'responses.scores_json as scores_json',
          'responses.confidence as confidence',
          'responses.relevance_score as relevance_score',
          'responses.flagged_reason as flagged_reason',
          'responses.flagged_at as flagged_at',
          'responses.created_at as created_at',
          'responses.updated_at as updated_at',
          'responses.question_id as question_id',
          'candidates.name as candidate_name',
          'candidates.email as candidate_email',
          'test_questions.prompt as prompt',
          'test_questions.type as type'
        ])
        .where('responses.org_id', '=', orgId!)
        .where((eb) => eb.or([eb('responses.flagged_reason', 'is not', null), eb('responses.confidence', '<', 60)]))
        .execute()
    );
    return Promise.all(
      flagged.map(async (resp) => ({
        id: resp.id,
        confidence: resp.confidence,
        relevanceScore: resp.relevance_score,
        scoresJson: resp.scores_json,
        flaggedReason: resp.flagged_reason,
        flaggedAt: resp.flagged_at,
        createdAt: resp.created_at,
        question: resp.prompt
          ? {
              prompt: resp.prompt,
              type: resp.type
            }
          : null,
        candidate: {
          name: resp.candidate_name,
          email: resp.candidate_email
        },
        signedUrl: await createSignedReadUrl(resp.audio_object_key)
      }))
    );
  });
}
