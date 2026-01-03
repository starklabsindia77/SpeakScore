import { FastifyInstance } from 'fastify';
import { db } from '../../db';

export async function brandingRoutes(app: FastifyInstance) {
    app.get('/public/branding', async (request, reply) => {
        const hostname = request.hostname.split(':')[0];

        const org = await db
            .selectFrom('organizations')
            .select(['id', 'name', 'branding_json'])
            .where('custom_domain', '=', hostname)
            .where('status', '=', 'ACTIVE')
            .executeTakeFirst();

        if (!org) {
            return reply.notFound('Branding not found for this domain');
        }

        return {
            orgId: org.id,
            name: org.name,
            branding: org.branding_json
        };
    });
}
