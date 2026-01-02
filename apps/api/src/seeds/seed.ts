import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { db, closeDb } from '../db';
import { migratePublic } from '../migrations/runner';
import { provisionOrganization, schemaFromOrgId } from '../services/tenancy';
import { logger } from '../logger';

async function seedPublicData() {
  const adminPassword = await bcrypt.hash('admin123!', 10);
  await db
    .insertInto('platform_admins')
    .values({
      id: randomUUID(),
      email: 'superadmin@speakscore.test',
      password_hash: adminPassword,
      token_version: 1,
      created_at: new Date(),
      updated_at: new Date()
    })
    .onConflict((oc) => oc.column('email').doNothing())
    .execute();

  const prompts = [
    { id: 'q-read-1', type: 'READ_ALOUD', prompt: 'Read aloud: Customer satisfaction is our priority.', meta_json: { expected: 'Customer satisfaction is our priority.' } },
    { id: 'q-repeat-1', type: 'REPEAT_SENTENCE', prompt: 'Please repeat: The package will arrive tomorrow morning.', meta_json: { expected: 'The package will arrive tomorrow morning.' } },
    { id: 'q-scenario-1', type: 'JOB_SCENARIO', prompt: 'Handle a call where a customer reports a delayed shipment.', meta_json: {} },
    { id: 'q-opinion-1', type: 'OPINION', prompt: 'Share your thoughts on what makes great customer service.', meta_json: {} }
  ];

  for (const p of prompts) {
    await db
      .insertInto('global_question_pool')
      .values({
        id: p.id,
        type: p.type,
        prompt: p.prompt,
        meta_json: p.meta_json,
        is_active: true,
        created_at: new Date()
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  }
}

async function main() {
  await migratePublic();
  await seedPublicData();

  const demoOrgId = '00000000-0000-0000-0000-000000000001';
  await provisionOrganization({
    id: demoOrgId,
    name: 'Demo BPO',
    schemaName: schemaFromOrgId(demoOrgId),
    creditsBalance: 10,
    adminEmail: 'admin@demo.com',
    adminPassword: 'changeme123'
  });

  logger.info('Seed completed');
}

main()
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
