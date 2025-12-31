import { FastifyInstance } from 'fastify';
import { createBatchSchema, CreateBatchInput } from '@speakscore/shared';
import { v4 as uuidv4 } from 'uuid';

export async function batchRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate);

    // List all batches for the organization
    app.get('/batches', async (request) => {
        const orgId = request.user!.orgId;
        return request.withTenantDb((tenantDb) =>
            tenantDb
                .selectFrom('batches')
                .selectAll()
                .where('org_id', '=', orgId!)
                .orderBy('created_at', 'desc')
                .execute()
        );
    });

    // Create a new batch
    app.post('/batches', async (request, reply) => {
        const orgId = request.user!.orgId;
        const userId = request.user!.userId;
        const data = request.body as CreateBatchInput;

        const validated = createBatchSchema.parse(data);

        const newBatch = {
            id: uuidv4(),
            org_id: orgId!,
            name: validated.name,
            description: validated.description || null,
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date(),
        };

        await request.withTenantDb((tenantDb) =>
            tenantDb.insertInto('batches').values(newBatch).execute()
        );

        return newBatch;
    });

    // Get details of a specific batch including candidates
    app.get('/batches/:id', async (request, reply) => {
        const orgId = request.user!.orgId;
        const { id } = request.params as { id: string };

        const batch = await request.withTenantDb((tenantDb) =>
            tenantDb
                .selectFrom('batches')
                .selectAll()
                .where('id', '=', id)
                .where('org_id', '=', orgId!)
                .executeTakeFirst()
        );

        if (!batch) return reply.notFound('Batch not found');

        const candidates = await request.withTenantDb((tenantDb) =>
            tenantDb
                .selectFrom('candidates')
                .selectAll()
                .where('batch_id', '=', id)
                .where('org_id', '=', orgId!)
                .execute()
        );

        return { ...batch, candidates };
    });

    // Delete a batch (only if empty or as a bulk operation)
    app.delete('/batches/:id', async (request, reply) => {
        const orgId = request.user!.orgId;
        const { id } = request.params as { id: string };

        await request.withTenantDb((tenantDb) =>
            tenantDb
                .deleteFrom('batches')
                .where('id', '=', id)
                .where('org_id', '=', orgId!)
                .execute()
        );

        return { success: true };
    });
}
