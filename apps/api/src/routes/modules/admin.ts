import { FastifyInstance } from 'fastify';
import { createOrgSchema } from '@speakscore/shared';
import { sql } from 'kysely';
import { db, withTenantTransaction } from '../../db';
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

  app.get('/analytics/usage', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    // 1. Get all active organizations to query their usage
    const orgs = await db.selectFrom('organizations')
      .select(['id', 'schema_name'])
      .where('status', '=', 'ACTIVE')
      .execute();

    const { withTenantTransaction } = await import('../../db');
    const dailyMap = new Map<string, number>();

    // 2. Iterate and aggregate (Parallelized)
    await Promise.all(orgs.map(async (org) => {
      try {
        await withTenantTransaction(org.schema_name, async (trx) => {
          const usage = await trx
            .selectFrom('credit_usage')
            .select(({ fn }) => [
              fn.sum<number>('credits_used').as('total'),
              sql<string>`to_char(used_at, 'YYYY-MM-DD')`.as('day')
            ])
            .where('used_at', '>', sql<Date>`now() - interval '30 days'`)
            .groupBy('day')
            .execute();

          for (const row of usage) {
            const day = row.day;
            const amount = Number(row.total || 0);
            dailyMap.set(day, (dailyMap.get(day) || 0) + amount);
          }
        });
      } catch (err) {
        // Ignore errors for single tenant logs to prevent total failure
        request.log.warn({ orgId: org.id, err }, 'Failed to fetch usage for org');
      }
    }));

    // 3. Format result
    const result = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  });

  app.get('/billing/stats', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const orgs = await db.selectFrom('organizations')
      .select(['id', 'schema_name', 'name'])
      .where('status', '=', 'ACTIVE')
      .execute();

    let totalRevenue = 0;
    let totalCreditsSold = 0;
    const orgBreakdown: any[] = [];

    await Promise.all(orgs.map(async (org) => {
      try {
        await withTenantTransaction(org.schema_name, async (trx) => {
          const stats = await trx.selectFrom('credit_purchases')
            .select(({ fn }) => [
              fn.sum<number>('amount').as('revenue'),
              fn.sum<number>('credits').as('credits')
            ])
            .where('status', '=', 'SUCCESS')
            .executeTakeFirst();

          const rev = Number(stats?.revenue || 0);
          const cred = Number(stats?.credits || 0);
          totalRevenue += rev;
          totalCreditsSold += cred;
          orgBreakdown.push({ orgId: org.id, name: org.name, revenue: rev, credits: cred });
        });
      } catch (err) {
        request.log.warn({ orgId: org.id, err }, 'Failed to fetch billing stats for org');
      }
    }));

    return { totalRevenue, totalCreditsSold, orgBreakdown };
  });

  app.get('/billing/transactions', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const orgs = await db.selectFrom('organizations')
      .select(['id', 'schema_name', 'name'])
      .where('status', '=', 'ACTIVE')
      .execute();

    const allTransactions: any[] = [];

    await Promise.all(orgs.map(async (org) => {
      try {
        await withTenantTransaction(org.schema_name, async (trx) => {
          const txs = await trx.selectFrom('credit_purchases')
            .select(['id', 'amount', 'credits', 'currency', 'status', 'created_at'])
            .orderBy('created_at', 'desc')
            .limit(50)
            .execute();

          for (const tx of txs) {
            allTransactions.push({
              ...tx,
              orgId: org.id,
              orgName: org.name
            });
          }
        });
      } catch (err) {
        request.log.warn({ orgId: org.id, err }, 'Failed to fetch transactions for org');
      }
    }));

    return allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100);
  });

  app.get('/health', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async () => {
    const start = Date.now();
    let dbStatus = 'disconnected';
    let dbLatency = 0;
    try {
      await db.selectFrom('platform_settings').select('key').limit(1).execute();
      dbStatus = 'connected';
      dbLatency = Date.now() - start;
    } catch (e) {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date(),
      services: {
        database: { status: dbStatus, latency: dbLatency },
        api: { status: 'running', version: '1.0.0' }
      }
    };
  });

  app.get('/orgs', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const { page = '1', pageSize = '20' } = (request.query as any) ?? {};
    const parsedPage = Number(page);
    const parsedSize = Number(pageSize);
    const pageNumber = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
    const size = Math.min(100, Math.max(1, Number.isFinite(parsedSize) ? parsedSize : 20));
    const totalRow = await db.selectFrom('organizations').select(({ fn }) => fn.countAll().as('count')).executeTakeFirst();
    const orgs = await db
      .selectFrom('organizations')
      .select(['id', 'name', 'credits_balance', 'created_at', 'schema_name', 'status', 'feature_costs', 'updated_at'])
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
        featureCosts: o.feature_costs,
        createdAt: o.created_at,
        updatedAt: o.updated_at
      }))
    };
  });

  app.get('/orgs/:id', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const orgId = (request.params as any).id;
    const org = await db
      .selectFrom('organizations')
      .select(['id', 'name', 'schema_name', 'status', 'credits_balance', 'feature_costs', 'created_at', 'updated_at'])
      .where('id', '=', orgId)
      .executeTakeFirst();
    if (!org) return reply.notFound('Organization not found');
    return {
      id: org.id,
      name: org.name,
      schemaName: org.schema_name,
      status: org.status,
      creditsBalance: org.credits_balance,
      featureCosts: org.feature_costs,
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
      adminPassword: data.adminPassword,
      featureCosts: data.featureCosts
    });
    return {
      id: org.id,
      name: org.name,
      schemaName: org.schema_name,
      status: org.status,
      creditsBalance: org.credits_balance,
      featureCosts: org.feature_costs,
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

  app.post('/migrations/run-all', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async () => {
    const { migrateAllTenants } = await import('../../migrations/runner');
    await migrateAllTenants();

  }); // Close migrations/run-all

  // --- Data Management (Export/Purge) ---

  app.get('/data/export', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const { orgId } = request.query as { orgId: string };
    if (!orgId) return reply.badRequest('Organization ID is required');

    const org = await db.selectFrom('organizations').selectAll().where('id', '=', orgId).executeTakeFirst();
    if (!org) return reply.notFound('Organization not found');

    // Stream or just fetch all (MVP: fetch all)
    const data = await withTenantTransaction(org.schema_name, async (trx) => {
      const candidates = await trx.selectFrom('candidates').selectAll().execute();
      const attempts = await trx.selectFrom('candidate_attempts').selectAll().execute();
      const responses = await trx.selectFrom('responses').selectAll().execute();
      return { organization: org, candidates, attempts, responses };
    });

    reply.header('Content-Disposition', `attachment; filename="export-${org.id}-${new Date().toISOString()}.json"`);
    return data;
  });

  app.post('/data/purge', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const { orgId, olderThanDays } = request.body as { orgId: string; olderThanDays: number };
    if (!orgId || !olderThanDays) return reply.badRequest('Missing required fields');

    const org = await db.selectFrom('organizations').select('schema_name').where('id', '=', orgId).executeTakeFirst();
    if (!org) return reply.notFound('Organization not found');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedCount = await withTenantTransaction(org.schema_name, async (trx) => {
      // Delete candidates created before cutoff. Cascades should handle attempts/responses if configured, 
      // but we'll delete explicitly to be safe if no cascade.
      // Assuming Cascade on FKs for MVP.
      const result = await trx.deleteFrom('candidates')
        .where('created_at', '<', cutoffDate)
        .executeTakeFirst();
      return result.numDeletedRows;
    });

    await logPlatformEvent({
      level: 'WARN',
      source: 'SYSTEM',
      message: `Purged data for org ${orgId} older than ${olderThanDays} days`,
      actorAdminId: request.user?.userId ?? null
    });

    return { success: true, deletedCount: Number(deletedCount) };
  });

  app.get('/settings/ai', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async () => {
    const setting = await db.selectFrom('platform_settings').selectAll().where('key', '=', 'ai_config').executeTakeFirst();
    return setting?.value ?? { enabled: false };
  });

  app.get('/settings/security', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async () => {
    const setting = await db.selectFrom('platform_settings').selectAll().where('key', '=', 'admin_security').executeTakeFirst();
    return setting?.value ?? { ipWhitelist: { enabled: false, ips: [] } };
  });

  app.post('/settings/security', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const body = request.body as { ipWhitelist: { enabled: boolean; ips: string[] } };
    const value = {
      ipWhitelist: {
        enabled: !!body.ipWhitelist?.enabled,
        ips: Array.isArray(body.ipWhitelist?.ips) ? body.ipWhitelist.ips : []
      },
      updatedAt: new Date().toISOString()
    };

    await db
      .insertInto('platform_settings')
      .values({
        key: 'admin_security',
        value: JSON.stringify(value),
        updated_at: new Date()
      })
      .onConflict((oc) =>
        oc.column('key').doUpdateSet({
          value: JSON.stringify(value),
          updated_at: new Date()
        })
      )
      .execute();

    await logPlatformEvent({
      level: 'WARN',
      source: 'SYSTEM',
      message: 'Security settings updated',
      actorAdminId: request.user?.userId ?? null,
      meta: { enabled: value.ipWhitelist.enabled, ipCount: value.ipWhitelist.ips.length }
    });

    return value;
  });

  app.get('/settings/billing', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async () => {
    const setting = await db.selectFrom('platform_settings').selectAll().where('key', '=', 'billing_config').executeTakeFirst();
    // Return empty config, masking the secret
    const config = (setting?.value as any) ?? { razorpay: { keyId: '', keySecret: '' } };
    if (config.razorpay?.keySecret) {
      config.razorpay.keySecret = '********'; // Mask secret
    }
    return config;
  });

  app.post('/settings/billing', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const body = request.body as { razorpay: { keyId: string, keySecret: string } };

    // Fetch existing to merge secret if not provided (i.e. just updating ID)
    const existing = await db.selectFrom('platform_settings').select('value').where('key', '=', 'billing_config').executeTakeFirst();
    const existingConfig = (existing?.value as any) || {};

    const newConfig = {
      razorpay: {
        keyId: body.razorpay.keyId,
        // If explicit new secret provided, use it. If '********', keep existing.
        keySecret: body.razorpay.keySecret === '********' ? existingConfig.razorpay?.keySecret : body.razorpay.keySecret
      }
    };

    const value = { ...newConfig, updatedAt: new Date().toISOString() };

    await db
      .insertInto('platform_settings')
      .values({
        key: 'billing_config',
        value: JSON.stringify(value),
        updated_at: new Date()
      })
      .onConflict((oc) =>
        oc.column('key').doUpdateSet({
          value: JSON.stringify(value),
          updated_at: new Date()
        })
      )
      .execute();

    await logPlatformEvent({
      level: 'WARN',
      source: 'SYSTEM',
      message: 'Billing settings updated',
      actorAdminId: request.user?.userId ?? null
    });

    return { success: true };
  });

  app.post('/settings/ai', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const { aiConfigSchema } = await import('@speakscore/shared');
    const data = aiConfigSchema.parse(request.body);
    await db
      .insertInto('platform_settings')
      .values({
        key: 'ai_config',
        value: JSON.stringify(data),
        updated_at: new Date()
      })
      .onConflict((oc) =>
        oc.column('key').doUpdateSet({
          value: JSON.stringify(data),
          updated_at: new Date()
        })
      )
      .execute();
    return { success: true };
  });
  app.patch('/orgs/:id/settings', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const orgId = (request.params as any).id;
    const body = request.body as any;

    // Check if featureCosts update
    if (body.featureCosts !== undefined) {
      const updated = await db
        .updateTable('organizations')
        .set({
          feature_costs: body.featureCosts ? JSON.stringify(body.featureCosts) : null,
          updated_at: new Date()
        })
        .where('id', '=', orgId)
        .returning(['id', 'name', 'schema_name', 'status', 'feature_costs'])
        .executeTakeFirst();

      if (!updated) return reply.notFound('Organization not found');
      return {
        id: updated.id,
        name: updated.name,
        schemaName: updated.schema_name,
        status: updated.status,
        featureCosts: updated.feature_costs
      };
    }

    return reply.badRequest('No valid settings provided');
  });

  app.get('/settings/feature-costs', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async () => {
    const setting = await db.selectFrom('platform_settings').selectAll().where('key', '=', 'global_feature_costs').executeTakeFirst();
    return setting?.value ?? { ATTEMPT_SUBMISSION: 1 };
  });

  app.post('/settings/feature-costs', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const { featureCostsSchema } = await import('@speakscore/shared');
    const data = featureCostsSchema.parse(request.body);
    await db
      .insertInto('platform_settings')
      .values({
        key: 'global_feature_costs',
        value: JSON.stringify(data),
        updated_at: new Date()
      })
      .onConflict((oc) =>
        oc.column('key').doUpdateSet({
          value: JSON.stringify(data),
          updated_at: new Date()
        })
      )
      .execute();
    return { success: true };
  });

  app.get('/questions', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const questions = await db.selectFrom('global_question_pool').selectAll().orderBy('created_at', 'desc').execute();
    return questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      metaJson: q.meta_json,
      isActive: q.is_active,
      createdAt: q.created_at
    }));
  });

  app.post('/questions', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const { createGlobalQuestionSchema } = await import('@speakscore/shared');
    const data = createGlobalQuestionSchema.parse(request.body);
    const id = (await import('crypto')).randomUUID();
    await db
      .insertInto('global_question_pool')
      .values({
        id,
        type: data.type,
        prompt: data.prompt,
        meta_json: data.metaJson,
        is_active: data.isActive,
        created_at: new Date()
      })
      .execute();
    return { id, ...data };
  });

  app.delete('/questions/:id', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const id = (request.params as any).id;
    const result = await db.deleteFrom('global_question_pool').where('id', '=', id).executeTakeFirst();
    if (result.numDeletedRows === BigInt(0)) return reply.notFound('Question not found');
    return { success: true };
  });

  app.get('/orgs/:id/users', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const orgId = (request.params as any).id;
    const { page = '1', pageSize = '20' } = (request.query as any) ?? {};
    const parsedPage = Number(page);
    const parsedSize = Number(pageSize);
    const pageNumber = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
    const size = Math.min(100, Math.max(1, Number.isFinite(parsedSize) ? parsedSize : 20));

    // Determine the user's schema to join roles if needed, or just select basic info
    // For now, simpler is better. We just want to see users to impersonate.
    // However, users are stored in the tenant schema or public?
    // Let's check tenant vs public. The 'users' table is in `db/types.ts`, let's verify if it's tenant specific.
    // Looking at `auth.ts`, it queries `tenantDb.selectFrom('users')`.
    // So users are in the TENANT schema. We must use `withTenantTransaction`.

    const org = await db.selectFrom('organizations').select(['schema_name']).where('id', '=', orgId).executeTakeFirst();
    if (!org) return reply.notFound('Organization not found');

    const { withTenantTransaction } = await import('../../db');

    const users = await withTenantTransaction(org.schema_name, async (trx) => {
      return trx.selectFrom('users')
        .select(['id', 'email', 'role', 'title', 'created_at'])
        .orderBy('created_at', 'desc')
        .offset((pageNumber - 1) * size)
        .limit(size)
        .execute();
    });

    return {
      page: pageNumber,
      pageSize: size,
      items: users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        title: u.title,
        createdAt: u.created_at
      }))
    };
  });

  app.post('/impersonate', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const { userId, orgId } = (request.body as any) as { userId: string, orgId: string };

    const org = await db.selectFrom('organizations').select(['schema_name', 'status']).where('id', '=', orgId).executeTakeFirst();
    if (!org) return reply.notFound('Organization not found');
    if (org.status !== 'ACTIVE') return reply.badRequest('Organization is not active');

    const { withTenantTransaction } = await import('../../db');

    const user = await withTenantTransaction(org.schema_name, async (trx) => {
      return trx.selectFrom('users').selectAll().where('id', '=', userId).executeTakeFirst();
    });

    if (!user) return reply.notFound('User not found in this organization');

    // Generate token for this user
    const token = app.jwt.sign({ userId: user.id, orgId, role: user.role as any });

    // Log this action
    await logPlatformEvent({
      level: 'WARN',
      source: 'AUTH',
      message: 'Super Admin impersonated user',
      actorAdminId: request.user?.userId ?? null,
      orgId,
      meta: { targetUserId: userId, targetUserEmail: user.email }
    });

    return { accessToken: token, user: { id: user.id, orgId, role: user.role, email: user.email } };
  });

  app.get('/admins', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request) => {
    const admins = await db.selectFrom('platform_admins')
      .select(['id', 'email', 'created_at'])
      .orderBy('created_at', 'desc')
      .execute();
    return admins.map(a => ({
      id: a.id,
      email: a.email,
      createdAt: a.created_at
    }));
  });

  app.post('/admins', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const { createPlatformAdminSchema } = await import('@speakscore/shared');
    const { email, password } = createPlatformAdminSchema.parse(request.body);

    // Check if exists
    const existing = await db.selectFrom('platform_admins').select('id').where('email', '=', email).executeTakeFirst();
    if (existing) return reply.conflict('Admin with this email already exists');

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);
    const id = (await import('crypto')).randomUUID();

    await db.insertInto('platform_admins')
      .values({
        id,
        email,
        password_hash: passwordHash,
        token_version: 1,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    await logPlatformEvent({
      level: 'WARN',
      source: 'AUTH',
      message: 'New Super Admin invited',
      actorAdminId: request.user?.userId ?? null,
      meta: { invitedEmail: email }
    });

    return { id, email };
  });

  app.delete('/admins/:id', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const id = (request.params as any).id;

    // Prevent self-deletion
    if (id === request.user?.userId) {
      return reply.badRequest('You cannot delete your own account');
    }

    const result = await db.deleteFrom('platform_admins').where('id', '=', id).executeTakeFirst();
    if (result.numDeletedRows === BigInt(0)) return reply.notFound('Admin not found');

    await logPlatformEvent({
      level: 'WARN',
      source: 'AUTH',
      message: 'Super Admin removed',
      actorAdminId: request.user?.userId ?? null,
      meta: { removedAdminId: id }
    });

    return { success: true };
  });

  app.post('/admins/:id/revoke-sessions', { preHandler: [app.authorize(['SUPER_ADMIN']), adminRateLimit] }, async (request, reply) => {
    const id = (request.params as any).id;

    const updateResult = await db.updateTable('platform_admins')
      .set({ token_version: sql`token_version + 1` })
      .where('id', '=', id)
      .returning('token_version')
      .executeTakeFirst();

    if (!updateResult) return reply.notFound('Admin not found');

    await logPlatformEvent({
      level: 'WARN',
      source: 'AUTH',
      message: 'Admin sessions revoked',
      actorAdminId: request.user?.userId ?? null,
      meta: { targetAdminId: id }
    });

    return { success: true, newVersion: updateResult.token_version };
  });
}
