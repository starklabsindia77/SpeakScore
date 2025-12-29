import { FastifyInstance } from 'fastify';
import { createOrgSchema } from '@speakscore/shared';
import { sql } from 'kysely';
import { db } from '../../db';
import { provisionOrganization } from '../../services/tenancy';
import { logPlatformEvent } from '../../services/audit';

const rateLimitState = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

async function adminRateLimit(request: any, reply: any) {
  const key = request.ip || 'global';
  const now = Date.now();
  const current = rateLimitState.get(key) ?? { count: 0, resetAt: now + WINDOW_MS };
  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + WINDOW_MS;
  }
  current.count += 1;
  rateLimitState.set(key, current);
  if (current.count > MAX_REQUESTS) {
    return reply.tooManyRequests('Slow down');
  }
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/orgs', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const { page = '1', pageSize = '20' } = (request.query as any) ?? {};
    const parsedPage = Number(page);
    const parsedSize = Number(pageSize);
    const pageNumber = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
    const size = Math.min(100, Math.max(1, Number.isFinite(parsedSize) ? parsedSize : 20));
    const totalRow = await db.selectFrom('organizations').select(({ fn }) => fn.countAll().as('count')).executeTakeFirst();
    const orgs = await db
      .selectFrom('organizations')
      .select(['id', 'name', 'credits_balance', 'created_at', 'schema_name', 'status', 'updated_at'])
      .orderBy('created_at', 'desc')
      .offset((pageNumber - 1) * size)
      .limit(size)
      .execute();
    return {
      total: Number(totalRow?.count ?? 0),
      page: pageNumber,
      pageSize: size,
      items: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        schemaName: o.schema_name,
        status: o.status,
        creditsBalance: o.credits_balance,
        createdAt: o.created_at,
        updatedAt: o.updated_at
      }))
    };
  });

  app.get('/orgs/:id', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const orgId = (request.params as any).id;
    const org = await db
      .selectFrom('organizations')
      .select(['id', 'name', 'schema_name', 'status', 'credits_balance', 'created_at', 'updated_at'])
      .where('id', '=', orgId)
      .executeTakeFirst();
    if (!org) return reply.notFound('Organization not found');
    return {
      id: org.id,
      name: org.name,
      schemaName: org.schema_name,
      status: org.status,
      creditsBalance: org.credits_balance,
      createdAt: org.created_at,
      updatedAt: org.updated_at
    };
  });

  app.post('/orgs', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const data = createOrgSchema.parse(request.body);
    const org = await provisionOrganization({
      name: data.name,
      schemaName: data.schemaName,
      creditsBalance: data.creditsBalance,
      adminEmail: data.adminEmail,
      adminPassword: data.adminPassword
    });
    return {
      id: org.id,
      name: org.name,
      schemaName: org.schema_name,
      status: org.status,
      creditsBalance: org.credits_balance,
      createdAt: org.created_at
    };
  });

  app.patch('/orgs/:id/status', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const orgId = (request.params as any).id;
    const { status } = (request.body as any) as { status?: string };
    if (!['ACTIVE', 'DISABLED'].includes(status ?? '')) {
      return reply.badRequest('Invalid status');
    }
    const result = await db.transaction().execute(async (trx) => {
      const updated = await trx
        .updateTable('organizations')
        .set({ status: status as any, updated_at: new Date() })
        .where('id', '=', orgId)
        .returning(['id', 'name', 'schema_name', 'status', 'credits_balance', 'created_at', 'updated_at'])
        .executeTakeFirst();
      if (!updated) return null;
      await logPlatformEvent(
        {
          level: 'INFO',
          source: 'API',
          message: status === 'DISABLED' ? 'Organization disabled' : 'Organization enabled',
          orgId,
          actorAdminId: request.user?.userId ?? null,
          meta: { status }
        },
        trx
      );
      return updated;
    });
    if (!result) return reply.notFound('Organization not found');
    return {
      id: result.id,
      name: result.name,
      schemaName: result.schema_name,
      status: result.status,
      creditsBalance: result.credits_balance,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  });

  app.post('/orgs/:id/credits', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const orgId = (request.params as any).id;
    const { credits, note } = (request.body as any) as { credits?: number; note?: string };
    if (typeof credits !== 'number' || credits <= 0 || !Number.isInteger(credits)) return reply.badRequest('credits must be a positive integer');
    const updated = await db.transaction().execute(async (trx) => {
      const org = await trx
        .updateTable('organizations')
        .set({ credits_balance: sql`credits_balance + ${credits}`, updated_at: new Date() })
        .where('id', '=', orgId)
        .returning(['id', 'name', 'credits_balance', 'schema_name', 'status', 'created_at', 'updated_at'])
        .executeTakeFirst();
      if (!org) return null;
      await logPlatformEvent(
        {
          level: 'INFO',
          source: 'API',
          message: 'Credits allocated',
          orgId,
          actorAdminId: request.user?.userId ?? null,
          meta: { creditsAdded: credits, note }
        },
        trx
      );
      return org;
    });
    if (!updated) return reply.notFound('Organization not found');
    return {
      id: updated.id,
      name: updated.name,
      schemaName: updated.schema_name,
      status: updated.status,
      creditsBalance: updated.credits_balance,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    };
  });

  app.get('/logs', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const query = (request.query as any) ?? {};
    const level = query.level as string | undefined;
    const orgId = query.org_id as string | undefined;
    const rawFromDate = query.from_date ? new Date(query.from_date as string) : null;
    const rawToDate = query.to_date ? new Date(query.to_date as string) : null;
    const fromDate = rawFromDate && !Number.isNaN(rawFromDate.getTime()) ? rawFromDate : null;
    const toDate = rawToDate && !Number.isNaN(rawToDate.getTime()) ? rawToDate : null;
    const parsedLimit = Number(query.limit ?? 100);
    const limit = Math.min(200, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 100));

    let builder = db
      .selectFrom('audit_logs_platform')
      .select(['id', 'level', 'source', 'message', 'org_id', 'meta_json', 'created_at'])
      .orderBy('created_at', 'desc')
      .limit(limit);
    if (level) builder = builder.where('level', '=', level.toUpperCase() as any);
    if (orgId) builder = builder.where('org_id', '=', orgId);
    if (fromDate) builder = builder.where('created_at', '>=', fromDate);
    if (toDate) builder = builder.where('created_at', '<=', toDate);
    const rows = await builder.execute();
    return rows.map((row) => ({
      id: row.id,
      level: row.level,
      source: row.source,
      message: row.message,
      orgId: row.org_id,
      meta: row.meta_json,
      createdAt: row.created_at
    }));
  });
}
