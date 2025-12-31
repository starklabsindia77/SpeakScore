
import { FastifyInstance } from 'fastify';
import { NotificationService } from '../../services/notification';

export async function notificationRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate);

    app.get('/notifications', async (request) => {
        const orgId = request.user!.orgId!;
        return request.withTenantDb(async (tenantDb) => {
            const service = new NotificationService(tenantDb, orgId);
            // If query param 'all' is true, return all, otherwise just unread or limited recent
            const { all } = (request.query as any) || {};
            if (all === 'true') {
                return service.getAll();
            }
            return service.getUnread();
        });
    });

    app.patch('/notifications/:id/read', async (request) => {
        const orgId = request.user!.orgId!;
        const id = (request.params as any).id;
        return request.withTenantDb(async (tenantDb) => {
            const service = new NotificationService(tenantDb, orgId);
            await service.markAsRead(id);
            return { success: true };
        });
    });

    app.post('/notifications/mark-all-read', async (request) => {
        const orgId = request.user!.orgId!;
        return request.withTenantDb(async (tenantDb) => {
            const service = new NotificationService(tenantDb, orgId);
            await service.markAllAsRead();
            return { success: true };
        });
    });
}
