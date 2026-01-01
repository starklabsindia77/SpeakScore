import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('platform_admins')
        .addColumn('token_version', 'integer', (col) => col.defaultTo(1))
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('platform_admins')
        .dropColumn('token_version')
        .execute();
}
