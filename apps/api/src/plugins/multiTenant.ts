import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { Kysely } from 'kysely';
import { resolveTenant, TenantAccessError } from '../services/tenancy';
import { Database } from '../db/types';
import { withTenantTransaction } from '../db';

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest('tenant', null);
  app.decorateRequest('withTenantDb', async function <T>(this: FastifyRequest, cb: (db: Kysely<Database>) => Promise<T>): Promise<T> {
    const ctx = this.tenant;
    if (!ctx) {
      throw new Error('Tenant context missing');
    }
    return withTenantTransaction(ctx.schemaName, cb);
  });

  app.addHook('preHandler', async (request, reply) => {
    // Skip public, auth, and admin management routes
    if (
      request.url.startsWith('/public') ||
      request.url.startsWith('/api/auth') ||
      request.url.startsWith('/api/admin')
    ) {
      return;
    }

    // Ensure authentication has been performed for all other /api routes
    try {
      await app.authenticate(request, reply);
    } catch (err) {
      // app.authenticate handles its own errors/replies
      return;
    }

    const user = request.user as { orgId?: string; role?: string } | undefined;
    let orgId = user?.orgId;

    // Phase 2: Custom Domain Resolution
    if (!orgId) {
      const hostname = request.hostname.split(':')[0]; // Remove port if present
      const orgByDomain = await db
        .selectFrom('organizations')
        .select('id')
        .where('custom_domain', '=', hostname)
        .where('status', '=', 'ACTIVE')
        .executeTakeFirst();

      if (orgByDomain) {
        orgId = orgByDomain.id;
      }
    }

    if (!orgId && !request.url.startsWith('/public')) {
      // If no org context and not a public route, it might be an attempt link
      // Attempt links are handled in public.ts or by token, so we let them pass 
      // if they don't require tenant context here, but most /api routes do.
      return reply.unauthorized('Missing org context');
    }

    if (!orgId) return; // Let public routes pass without tenant context if not found

    let org;
    try {
      org = await resolveTenant(orgId);
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

    request.tenant = { orgId: org.id, schemaName: org.schema_name };
  });
});

declare module 'fastify' {
  interface FastifyRequest {
    tenant: { orgId: string; schemaName: string } | null;
    withTenantDb: <T>(cb: (db: Kysely<Database>) => Promise<T>) => Promise<T>;
  }
}
