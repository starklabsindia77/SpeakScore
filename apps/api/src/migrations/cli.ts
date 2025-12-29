import { migrateAllTenants, migratePublic, migrateTenant } from './runner';
import { logger } from '../logger';
import { closeDb } from '../db';

async function main() {
  const mode = process.argv[2];
  try {
    if (mode === 'public') {
      await migratePublic();
    } else if (mode === 'tenant') {
      const schemaArg = process.argv.find((arg) => arg.startsWith('--schema='));
      if (!schemaArg) throw new Error('Missing --schema argument for tenant migration');
      const schema = schemaArg.split('=')[1];
      await migrateTenant(schema);
    } else if (mode === 'all-tenants') {
      await migrateAllTenants();
    } else {
      throw new Error('Usage: ts-node src/migrations/cli.ts [public|tenant|all-tenants] [--schema=tenant_schema]');
    }
  } catch (err) {
    logger.error({ err }, 'Migration failed');
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

main();
