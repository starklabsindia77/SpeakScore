
import { Kysely, sql } from 'kysely';
import { Database } from '../db/types';
import { randomUUID } from 'crypto';

export class NotificationService {
    constructor(private db: Kysely<Database>, private orgId: string) { }

    async create(type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', title: string, message: string, data?: any) {
        return this.db
            .insertInto('notifications')
            .values({
                id: randomUUID(),
                org_id: this.orgId,
                type,
                title,
                message,
                is_read: false,
                data: data ? JSON.stringify(data) : null,
                created_at: new Date(),
                updated_at: new Date()
            })
            .execute();
    }

    async getUnread() {
        return this.db
            .selectFrom('notifications')
            .selectAll()
            .where('org_id', '=', this.orgId)
            .where('is_read', '=', false)
            .orderBy('created_at', 'desc')
            .limit(50)
            .execute();
    }

    async getAll(limit = 20, offset = 0) {
        return this.db
            .selectFrom('notifications')
            .selectAll()
            .where('org_id', '=', this.orgId)
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset)
            .execute();
    }

    async markAsRead(id: string) {
        return this.db
            .updateTable('notifications')
            .set({ is_read: true, updated_at: new Date() })
            .where('id', '=', id)
            .where('org_id', '=', this.orgId)
            .execute();
    }

    async markAllAsRead() {
        return this.db
            .updateTable('notifications')
            .set({ is_read: true, updated_at: new Date() })
            .where('org_id', '=', this.orgId)
            .where('is_read', '=', false)
            .execute();
    }
}
