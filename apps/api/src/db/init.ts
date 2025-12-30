import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { migratePublic } from '../migrations/runner';
import { logger } from '../logger';

export async function initDatabase() {
    logger.info('Initializing database...');

    // 1. Sync public schema
    await migratePublic();

    // 2. Seed platform admin if not exists
    await seedPlatformAdmin();

    logger.info('Database initialization complete');
}

async function seedPlatformAdmin() {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'superadmin@speakscore.test';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123!';

    const existing = await db
        .selectFrom('platform_admins')
        .select('id')
        .where('email', '=', adminEmail)
        .executeTakeFirst();

    if (!existing) {
        logger.info({ email: adminEmail }, 'Seeding platform admin');
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await db
            .insertInto('platform_admins')
            .values({
                id: randomUUID(),
                email: adminEmail,
                password_hash: passwordHash,
                role: 'SUPER_ADMIN',
                created_at: new Date()
            })
            .execute();
    } else {
        logger.info({ email: adminEmail }, 'Platform admin already exists');
    }
}
