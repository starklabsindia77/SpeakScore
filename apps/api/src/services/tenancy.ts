import { prisma } from '../db';

function normalizeSchemaName(schemaName: string) {
  const cleaned = schemaName.replace(/[^a-zA-Z0-9_]/g, '_');
  const prefixed = /^[a-zA-Z_]/.test(cleaned) ? cleaned : `org_${cleaned}`;
  return prefixed || 'org_default';
}

export async function ensureOrgSchema(rawName: string) {
  const safeName = normalizeSchemaName(rawName);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${safeName}"`);
  return safeName;
}

export function schemaFromOrgName(orgName: string) {
  return normalizeSchemaName(orgName.trim().toLowerCase().replace(/\s+/g, '_'));
}
