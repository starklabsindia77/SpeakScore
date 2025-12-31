import { FastifyInstance } from 'fastify';
import { Parser } from 'json2csv';
import { createSignedReadUrl } from '../../services/storage';
import { createAttemptSchema, bulkInviteSchema } from '@speakscore/shared';
import { randomUUID } from 'crypto';
import { sql } from 'kysely';

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
            'test_id',
            'batch_id'
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
          testId: r.test_id,
          batchId: r.batch_id
        }))
      );
  });

  // Create single candidate (Manual Entry)
  app.post('/candidates', async (request, reply) => {
    const orgId = request.user!.orgId!;
    const data = createAttemptSchema.parse(request.body);

    return request.withTenantDb(async (tenantDb) => {
      const [candidate] = await tenantDb
        .insertInto('candidates')
        .values({
          id: randomUUID(),
          org_id: orgId,
          test_id: data.testId || null,
          batch_id: data.batchId || null,
          name: data.candidateName,
          email: data.candidateEmail,
          status: 'INVITED',
          created_at: new Date()
        })
        .returningAll()
        .execute();
      return candidate;
    });
  });

  // Bulk Create/Invite
  app.post('/candidates/bulk', async (request, reply) => {
    const orgId = request.user!.orgId!;
    const { batchId, candidates: list } = bulkInviteSchema.parse(request.body);

    return request.withTenantDb(async (tenantDb) => {
      const results: { id: string; org_id: string; test_id: string | null; batch_id: string | null; name: string; email: string; phone: string | null; status: "INVITED" | "STARTED" | "SUBMITTED" | "SCORED" | "EXPIRED"; overall_score: number | null; decision: "PASS" | "BORDERLINE" | "FAIL" | null; started_at: Date | null; submitted_at: Date | null; scored_at: Date | null; created_at: Date; }[] = [];
      for (const item of list) {
        const [candidate] = await tenantDb
          .insertInto('candidates')
          .values({
            id: randomUUID(),
            org_id: orgId,
            batch_id: batchId || null,
            name: item.name,
            email: item.email,
            status: 'INVITED',
            created_at: new Date()
          })
          .returningAll()
          .execute();
        results.push(candidate);
      }
      return { count: results.length, candidates: results };
    });
  });

  // CSV Import (Stub for now - processing JSON-converted CSV from frontend)
  app.post('/candidates/import/csv', async (request, reply) => {
    const orgId = request.user!.orgId!;
    const { batchId, candidates: list } = request.body as any; // Expecting validated objects from frontend

    return request.withTenantDb(async (tenantDb) => {
      for (const item of list) {
        await tenantDb
          .insertInto('candidates')
          .values({
            id: randomUUID(),
            org_id: orgId,
            batch_id: batchId || null,
            name: item.name,
            email: item.email,
            status: 'INVITED',
            created_at: new Date()
          })
          .execute();
      }
      return { success: true, count: list.length };
    });
  });

  // CV Parsing (Real AI with File Support)
  app.post('/candidates/parse-cv', async (request, reply) => {
    let resumeText = '';
    const contentType = request.headers['content-type'];

    if (contentType?.includes('multipart/form-data')) {
      const data = await request.file();
      if (!data) return reply.badRequest('No file uploaded');

      // 5MB limit check could be added here, but relying on defaults for now
      const buffer = await data.toBuffer();
      const { ExtractionService } = await import('../../services/extraction');
      const extractor = new ExtractionService();
      try {
        resumeText = await extractor.extractText(buffer, data.mimetype);
      } catch (err: any) {
        request.log.error(err, 'Extraction failed');
        return reply.badRequest(`File parsing failed: ${err.message}`);
      }
    } else {
      // Expect JSON with text field
      const { text } = (request.body as any) || {};
      resumeText = text;
    }


    if (!resumeText) {
      // Fallback/Demo content
      resumeText = `
        John Doe
        john.doe@example.com
        +1234567890
        Senior Frontend Engineer with 8 years of experience.
        Skills: React, Node.js, TypeScript, AWS.
      `;
    }

    const { AiService } = await import('../../services/ai');
    const ai = new AiService();
    try {
      const result = await ai.parseCV(resumeText);
      return result;
    } catch (err: any) {
      request.log.error(err, 'CV Parsing failed');
      return reply.serviceUnavailable(`AI Service Error: ${err.message}`);
    }
  });

  // Bulk CV Import
  app.post('/candidates/import/cv-bulk', async (request, reply) => {
    const orgId = request.user!.orgId!;
    const parts = request.files();
    const batchIdField = await parts.next();
    // Assuming 'batchId' is the first field or we iterate to find it. 
    // Actually, multiparty iteration is tricky. Let's iterate all parts.

    // Better strategy: Use a variable to store batchId and an array for candidate promises
    let batchId = '';
    const parsingPromises: Promise<any>[] = [];
    const { ExtractionService } = await import('../../services/extraction');
    const { AiService } = await import('../../services/ai');
    const extractor = new ExtractionService();
    const ai = new AiService();

    // We need to re-iterate or handle order. 
    // Fastify multipart gives us an async iterator.
    // If we use 'parts', we must consume it.

    // New iterator for request.parts()
    for await (const part of request.parts()) {
      if (part.type === 'field' && part.fieldname === 'batchId') {
        batchId = (part as any).value as string;
      } else if (part.type === 'file') {
        // Process file immediately
        const buffer = await part.toBuffer();
        const mimetype = part.mimetype;
        parsingPromises.push((async () => {
          try {
            const text = await extractor.extractText(buffer, mimetype);
            const result = await ai.parseCV(text);
            return result; // { name, email, skills }
          } catch (e: any) {
            request.log.error(`Failed to parse file ${part.filename}: ${e.message}`);
            return null;
          }
        })());
      }
    }

    if (!batchId) {
      return reply.badRequest('batchId is required');
    }

    const results = await Promise.all(parsingPromises);
    const validCandidates = results.filter(r => r && r.name && r.email);

    if (validCandidates.length === 0) {
      return { success: false, message: 'No valid candidates found' };
    }

    return request.withTenantDb(async (tenantDb) => {
      for (const item of validCandidates) {
        await tenantDb
          .insertInto('candidates')
          .values({
            id: randomUUID(),
            org_id: orgId,
            batch_id: batchId,
            name: item.name,
            email: item.email,
            status: 'INVITED', // Directly to INVITED or NEW? INVITED matches others
            created_at: new Date()
          })
          .execute();
      }
      return { success: true, count: validCandidates.length, parsed: validCandidates };
    });
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
