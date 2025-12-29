import { FastifyInstance } from 'fastify';
import { candidateResponseSchema, submitAttemptSchema } from '@speakscore/shared';
import { prisma } from '../../db';
import { createHash } from 'crypto';
import { createSignedUploadUrl } from '../../services/storage';
import { simpleScoreFromTranscript } from '../../services/scoring';

function parseToken(rawToken: string) {
  const [orgId, tokenBody] = rawToken.split(':');
  if (!orgId || !tokenBody) throw new Error('Invalid token');
  return { orgId, tokenBody };
}

async function findAttempt(rawToken: string) {
  const { orgId, tokenBody } = parseToken(rawToken);
  const tokenHash = createHash('sha256').update(`${orgId}:${tokenBody}`).digest('hex');
  return prisma.candidateAttempt.findFirst({ where: { orgId, tokenHash }, include: { candidate: true, test: true } });
}

export async function publicRoutes(app: FastifyInstance) {
  app.get('/attempt/:token', async (request, reply) => {
    const token = (request.params as any).token as string;
    let attempt;
    try {
      attempt = await findAttempt(token);
    } catch (e) {
      return reply.badRequest('Invalid token');
    }
    if (!attempt) return reply.notFound('Attempt not found');
    if (attempt.expiresAt < new Date()) return reply.badRequest('Link expired');
    const questions = await prisma.testQuestion.findMany({ where: { OR: [{ orgId: attempt.orgId }, { orgId: null }], isActive: true } });
    return { attemptId: attempt.id, candidate: attempt.candidate, test: attempt.test, questions };
  });

  app.post('/attempt/:token/start', async (request, reply) => {
    const token = (request.params as any).token as string;
    const attempt = await findAttempt(token);
    if (!attempt) return reply.notFound('Attempt not found');
    await prisma.candidate.updateMany({ where: { id: attempt.candidateId, orgId: attempt.orgId }, data: { status: 'STARTED', startedAt: new Date() } });
    return reply.send({ ok: true });
  });

  app.post('/attempt/:token/response', async (request, reply) => {
    const token = (request.params as any).token as string;
    const attempt = await findAttempt(token);
    if (!attempt) return reply.notFound('Attempt not found');
    const body = candidateResponseSchema.parse(request.body);
    const uploadUrl = await createSignedUploadUrl(body.audioObjectKey, 'audio/webm');
    await prisma.response.create({
      data: {
        orgId: attempt.orgId,
        attemptId: attempt.id,
        candidateId: attempt.candidateId,
        questionId: body.questionId,
        audioObjectKey: body.audioObjectKey
      }
    });
    return { uploadUrl };
  });

  app.post('/attempt/:token/submit', async (request, reply) => {
    const token = (request.params as any).token as string;
    const attempt = await findAttempt(token);
    if (!attempt) return reply.notFound('Attempt not found');
    submitAttemptSchema.parse(request.body);
    const responses = await prisma.response.findMany({ where: { attemptId: attempt.id, orgId: attempt.orgId } });
    let totalScore = 0;
    let flaggedCount = 0;
    for (const resp of responses) {
      const { overall, scores, decision, feedback, confidence, relevance, flagged, flaggedReason } = simpleScoreFromTranscript(resp.transcript ?? '');
      await prisma.response.update({
        where: { id: resp.id },
        data: {
          scoresJson: { ...scores, feedback },
          confidence,
          relevanceScore: relevance,
          flaggedReason: flagged ? flaggedReason : null,
          flaggedAt: flagged ? new Date() : null
        }
      });
      if (flagged) flaggedCount += 1;
      totalScore += overall;
    }
    const overallScore = responses.length ? Math.round(totalScore / responses.length) : 0;
    const decision = overallScore >= 70 ? 'PASS' : overallScore >= 55 ? 'BORDERLINE' : 'FAIL';
    const status = flaggedCount > 0 ? 'SUBMITTED' : 'SCORED';
    await prisma.$transaction(async (tx) => {
      const existing = await tx.creditUsage.findUnique({ where: { attemptId: attempt.id } });
      if (!existing) {
        await tx.creditUsage.create({ data: { orgId: attempt.orgId, attemptId: attempt.id, candidateId: attempt.candidateId, creditsUsed: 1 } });
        await tx.organization.update({ where: { id: attempt.orgId }, data: { creditsBalance: { decrement: 1 } } });
      }
    });
    await prisma.candidate.updateMany({
      where: { id: attempt.candidateId, orgId: attempt.orgId },
      data: { status, submittedAt: new Date(), scoredAt: new Date(), overallScore, decision }
    });
    return reply.send({ overallScore, decision, flaggedCount });
  });
}
