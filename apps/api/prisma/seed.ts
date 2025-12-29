import { PrismaClient, QuestionType, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo BPO',
      creditsBalance: 10
    }
  });

  const passwordHash = await bcrypt.hash('changeme123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      orgId: org.id,
      email: 'admin@demo.com',
      passwordHash,
      role: Role.ORG_ADMIN
    }
  });

  const prompts = [
    { type: QuestionType.READ_ALOUD, prompt: 'Read aloud: Customer satisfaction is our priority.', metaJson: { expected: 'Customer satisfaction is our priority.' } },
    { type: QuestionType.REPEAT_SENTENCE, prompt: 'Please repeat: The package will arrive tomorrow morning.', metaJson: { expected: 'The package will arrive tomorrow morning.' } },
    { type: QuestionType.JOB_SCENARIO, prompt: 'Handle a call where a customer reports a delayed shipment.', metaJson: {} },
    { type: QuestionType.OPINION, prompt: 'Share your thoughts on what makes great customer service.', metaJson: {} }
  ];

  for (const p of prompts) {
    await prisma.testQuestion.upsert({
      where: { id: `${p.type}-${p.prompt}` },
      update: {},
      create: {
        id: `${p.type}-${p.prompt}`,
        orgId: null,
        type: p.type,
        prompt: p.prompt,
        metaJson: p.metaJson
      }
    });
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
