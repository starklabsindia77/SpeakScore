import { FastifyInstance } from 'fastify';
import { createTestSchema, createAttemptSchema } from '@speakscore/shared';
import { prisma } from '../../db';
import { randomUUID, createHash } from 'crypto';
import { addMinutes } from 'date-fns';

export async function testRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/tests', async (request) => {
    const orgId = request.user!.orgId;
    const userId = request.user!.userId;
    const data = createTestSchema.parse(request.body);
    return prisma.test.create({
      data: {
        orgId,
        name: data.name,
        configJson: data.configJson,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: userId
      }
    });
  });

  app.get('/tests', async (request) => {
    const orgId = request.user!.orgId;
    return prisma.test.findMany({
      where: { orgId },
      select: { id: true, name: true, isActive: true, createdAt: true }
    });
  });

  app.get('/tests/:id', async (request, reply) => {
    const orgId = request.user!.orgId;
    const testId = (request.params as any).id;
    const test = await prisma.test.findFirst({ where: { id: testId, orgId }, include: { candidates: true } });
    if (!test) return reply.notFound('Test not found');
    const questions = await prisma.testQuestion.findMany({ where: { OR: [{ orgId }, { orgId: null }], isActive: true } });
    return { ...test, questions };
  });

  app.post('/tests/:id/links', async (request, reply) => {
    const orgId = request.user!.orgId;
    const testId = (request.params as any).id;
    const data = createAttemptSchema.parse(request.body);
    const test = await prisma.test.findFirst({ where: { id: testId, orgId } });
    if (!test) return reply.notFound('Test missing');

    const candidate = await prisma.candidate.create({
      data: {
        orgId,
        testId,
        name: data.candidateName,
        email: data.candidateEmail
      }
    });
    const rawToken = randomUUID();
    const token = `${orgId}:${rawToken}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const attempt = await prisma.candidateAttempt.create({
      data: {
        orgId,
        testId,
        candidateId: candidate.id,
        tokenHash,
        expiresAt: addMinutes(new Date(), 60)
      }
    });
    return { token, attemptId: attempt.id };
  });

  app.get('/tests/:id/candidates', async (request) => {
    const orgId = request.user!.orgId;
    const testId = (request.params as any).id;
    return prisma.candidate.findMany({
      where: { orgId, testId },
      select: { id: true, name: true, email: true, status: true, overallScore: true, decision: true, submittedAt: true }
    });
  });
}
