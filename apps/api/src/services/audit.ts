import { Kysely } from 'kysely';
import { db } from '../db';
import { Database } from '../db/types';

export type PlatformLogLevel = 'INFO' | 'WARN' | 'ERROR';
export type PlatformLogSource = 'API' | 'AI' | 'AUTH' | 'SYSTEM';

type LogOptions = {
  level?: PlatformLogLevel;
  source?: PlatformLogSource;
  message: string;
  orgId?: string | null;
  actorAdminId?: string | null;
  impersonatorAdminId?: string | null;
  meta?: Record<string, any> | null;
  action?: string | null;
};

export async function logPlatformEvent({
  level = 'INFO',
  source = 'API',
  message,
  orgId = null,
  actorAdminId = null,
  impersonatorAdminId = null,
  meta = null,
  action = null
}: LogOptions, client: Kysely<Database> = db) {
  await client
    .insertInto('audit_logs_platform')
    .values({
      actor_admin_id: actorAdminId,
      level,
      source,
      message,
      action: action ?? message,
      org_id: orgId,
      meta_json: meta,
      impersonator_admin_id: impersonatorAdminId,
      created_at: new Date()
    })
    .execute();
}

type TenantLogOptions = {
  orgId: string;
  actorUserId?: string | null;
  impersonatorAdminId?: string | null;
  action: string;
  meta?: Record<string, any> | null;
};

export async function logTenantEvent(
  { orgId, actorUserId = null, impersonatorAdminId = null, action, meta = null }: TenantLogOptions,
  tenantDb: Kysely<Database>
) {
  await tenantDb
    .insertInto('audit_logs')
    .values({
      id: (await import('crypto')).randomUUID(),
      org_id: orgId,
      actor_user_id: actorUserId,
      impersonator_admin_id: impersonatorAdminId,
      action,
      meta_json: meta,
      created_at: new Date()
    })
    .execute();
}
