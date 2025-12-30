import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { Permission } from '@speakscore/shared';

export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'RECRUITER' | string;

function authorize(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role?: Role } | undefined;
    if (!user?.role) return reply.unauthorized();

    // Super roles bypass
    if (user.role === 'SUPER_ADMIN') return;

    if (!roles.includes(user.role)) {
      return reply.forbidden('Insufficient role');
    }
  };
}

function hasPermission(permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { userId: string; role: string; orgId?: string } | undefined;
    if (!user) return reply.unauthorized();

    // SUPER_ADMIN has all permissions
    if (user.role === 'SUPER_ADMIN') return;

    // For other users, we need to check their permissions in the tenant DB
    // This requires the tenant context to be available
    if (!request.withTenantDb) {
      // Fallback for routes that don't have tenant context yet
      // or just error out as it's a developer mistake
      return reply.internalServerError('Tenant context required for permission check');
    }

    const has = await request.withTenantDb(async (tenantDb) => {
      // Find user and their custom role permissions
      const userRow = await tenantDb
        .selectFrom('users')
        .leftJoin('custom_roles', 'users.custom_role_id', 'custom_roles.id')
        .select(['custom_roles.permissions', 'users.role as legacyRole'])
        .where('users.id', '=', user.userId)
        .executeTakeFirst();

      if (!userRow) return false;

      const userPerms = userRow.permissions || [];

      // ORG_ADMIN bypass if needed, or if they have '*'
      if (userRow.legacyRole === 'ORG_ADMIN' || userPerms.includes('*')) return true;

      return permissions.every(p => userPerms.includes(p));
    });

    if (!has) {
      return reply.forbidden('Missing required permissions');
    }
  };
}

export default fp(async (app: FastifyInstance) => {
  app.decorate('authorize', authorize);
  app.decorate('hasPermission', hasPermission);
});

declare module 'fastify' {
  interface FastifyInstance {
    authorize: typeof authorize;
    hasPermission: typeof hasPermission;
  }
}
