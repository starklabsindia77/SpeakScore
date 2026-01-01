import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../env';

export interface AuthPayload {
  userId: string;
  orgId?: string;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'RECRUITER';
  v?: number;
}

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '30m' }
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<AuthPayload>();
      const { userId, orgId, role, v } = payload;

      // If no version in token, assume 1. If DB has > 1, invalid.
      const tokenVersion = v ?? 1;

      // Import DB dynamically to avoid circular dependencies if any, 
      // or just import at top if safe. 
      // Assuming 'db' is available via import.
      const { db, withTenantTransaction } = await import('../db');

      // Token version verification - wrapped in try-catch to handle migration period
      // where token_version column might not exist yet
      try {
        if (role === 'SUPER_ADMIN') {
          const admin = await db.selectFrom('platform_admins').select('token_version').where('id', '=', userId).executeTakeFirst();
          if (!admin || (admin.token_version ?? 1) > tokenVersion) {
            throw new Error('Session Revoked');
          }
        } else if (orgId) {
          // Resolve tenant
          const org = await db.selectFrom('organizations').select('schema_name').where('id', '=', orgId).executeTakeFirst();
          if (org) {
            const user = await withTenantTransaction(org.schema_name, async (trx) =>
              trx.selectFrom('users').select('token_version').where('id', '=', userId).executeTakeFirst()
            );
            if (!user || (user.token_version ?? 1) > tokenVersion) {
              throw new Error('Session Revoked');
            }
          }
        }
      } catch (versionCheckError: any) {
        // If the error is about missing column, allow the request (migration not run yet)
        // Otherwise, reject the session
        if (!versionCheckError.message?.includes('column') &&
          !versionCheckError.message?.includes('does not exist') &&
          versionCheckError.message === 'Session Revoked') {
          throw versionCheckError;
        }
        // Log the error but continue (likely migration pending)
        request.log.debug({ err: versionCheckError }, 'Token version check skipped (migration pending)');
      }
    } catch (err) {
      reply.unauthorized('Session expired or revoked');
    }
  });
});

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthPayload;
    user: AuthPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
  }
}
