import { FastifyInstance } from 'fastify';
import { Parser } from 'json2csv';
import { prisma } from '../../db';
import { createSignedReadUrl } from '../../services/storage';

export async function candidateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/candidates', async (request) => {
    const orgId = request.user!.orgId;
    return prisma.candidate.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        overallScore: true,
        decision: true,
        submittedAt: true,
        scoredAt: true,
        createdAt: true,
        testId: true
      },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.get('/candidates/export.csv', async (request, reply) => {
    const orgId = request.user!.orgId;
    const records = await prisma.candidate.findMany({
      where: { orgId },
      select: { name: true, email: true, status: true, overallScore: true, decision: true, submittedAt: true }
    });
    const parser = new Parser();
    const csv = parser.parse(records);
    reply.header('Content-Type', 'text/csv');
    reply.send(csv);
  });

  app.get('/candidates/:id', async (request, reply) => {
    const orgId = request.user!.orgId;
    const id = (request.params as any).id;
    const candidate = await prisma.candidate.findFirst({ where: { id, orgId } });
    if (!candidate) return reply.notFound('Candidate not found');
    const responses = await prisma.response.findMany({ where: { orgId, candidateId: id }, include: { question: true } });
    const enriched = await Promise.all(
      responses.map(async (r) => ({
        ...r,
        signedUrl: await createSignedReadUrl(r.audioObjectKey)
      }))
    );
    return { candidate, responses: enriched };
  });

  app.get('/candidates/review/flags', async (request) => {
    const orgId = request.user!.orgId;
    const flagged = await prisma.response.findMany({
      where: {
        orgId,
        OR: [{ flaggedReason: { not: null } }, { confidence: { lt: 60 } }]
      },
      include: { candidate: true, question: true }
    });
    const enriched = await Promise.all(
      flagged.map(async (resp) => ({
        ...resp,
        signedUrl: await createSignedReadUrl(resp.audioObjectKey)
      }))
    );
    return enriched;
  });
}
