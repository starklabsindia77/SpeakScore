import { FastifyInstance } from 'fastify';
import { db, withTenantTransaction } from '../../db';
import { randomUUID } from 'crypto';

export async function integrationsRoutes(app: FastifyInstance) {
    // Public webhook for Greenhouse
    app.post('/public/integrations/greenhouse/webhook', async (request, reply) => {
        const payload = request.body as any;
        const { action, application } = payload;

        // Greenhouse often sends a 'ping' or specific actions like 'candidate_stage_change'
        if (action === 'ping') return { message: 'pong' };

        // Find organization by some custom header or body field mapped during setup
        // For this demo, we assume the orgId is passed in a query param or part of the URL during setup
        const { orgId } = (request.query as any);
        if (!orgId) return reply.badRequest('orgId missing');

        const org = await db.selectFrom('organizations').select('schema_name').where('id', '=', orgId).executeTakeFirst();
        if (!org) return reply.notFound('Org not found');

        if (action === 'candidate_stage_change') {
            const candidateData = application.candidate;
            const targetStage = application.stage.name;

            // Logic: If stage is 'SpeakScore Assessment', create candidate and invite
            if (targetStage === 'SpeakScore Assessment') {
                await withTenantTransaction(org.schema_name, async (tenantDb) => {
                    await tenantDb
                        .insertInto('candidates')
                        .values({
                            id: randomUUID(),
                            org_id: orgId,
                            name: `${candidateData.first_name} ${candidateData.last_name}`,
                            email: candidateData.email_addresses[0].value,
                            status: 'INVITED',
                            created_at: new Date()
                        })
                        .execute();
                });

                // In a real app, we would also trigger the email invitation here
            }
        }

        return { received: true };
    });

    // Admin routes for managing integrations
    app.get('/api/integrations', async (request) => {
        const { orgId } = request.tenant!;
        return db
            .selectFrom('integrations')
            .selectAll()
            .where('org_id', '=', orgId)
            .execute();
    });

    app.post('/api/integrations', async (request) => {
        const { orgId } = request.tenant!;
        const body = request.body as any;

        const [integration] = await db
            .insertInto('integrations')
            .values({
                id: randomUUID(),
                org_id: orgId,
                provider: body.provider,
                config_json: JSON.stringify(body.config),
                status: 'ACTIVE',
                created_at: new Date(),
                updated_at: new Date()
            })
            .returningAll()
            .execute();

        return integration;
    });
}
