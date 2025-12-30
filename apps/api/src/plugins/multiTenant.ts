import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Kysely } from 'kysely';
import { resolveTenant, TenantAccessError } from '../services/tenancy';
import { Database } from '../db/types';
import { withTenantTransaction } from '../db';

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest('tenant', null);
  app.decorateRequest('withTenantDb', async function <T>(cb: (db: Kysely<Database>) => Promise<T>): Promise<T> {
    const ctx = (this as any).tenant as { schemaName: string } | null;
    if (!ctx) {
      throw new Error('Tenant context missing');
    }
    return withTenantTransaction(ctx.schemaName, cb);
  });

  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/public') || request.url.startsWith('/api/auth')) return;
    const user = request.user as { orgId?: string; role?: string } | undefined;
    if (!user) {
      return reply.unauthorized('Missing auth context');
    }
    if (user.role === 'SUPER_ADMIN') {
      if (request.url.startsWith('/api/admin')) return;
      return reply.forbidden('SUPER_ADMIN access limited to admin endpoints');
    }
    if (!user.orgId) {
      return reply.unauthorized('Missing org context');
    }
    let org;
    try {
      org = await resolveTenant(user.orgId);
    } catch (err) {
      if (err instanceof TenantAccessError) {
        if (err.code === 'DISABLED') {
          return reply.forbidden('Organization disabled');
        }
        return reply.badRequest('Organization unavailable');
      }
      request.log.error({ err }, 'Failed to resolve tenant');
      return reply.internalServerError();
    }
    if (!org) {
      return reply.badRequest('Organization unavailable');
    }
    (request as any).tenant = { orgId: org.id, schemaName: org.schema_name };
  });
});

declare module 'fastify' {
  interface FastifyRequest {
    tenant: { orgId: string; schemaName: string } | null;
    withTenantDb: <T>(cb: (db: Kysely<Database>) => Promise<T>) => Promise<T>;
  }
}
