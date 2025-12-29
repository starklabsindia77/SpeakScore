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
  meta?: Record<string, any> | null;
  action?: string | null;
};

export async function logPlatformEvent({
  level = 'INFO',
  source = 'API',
  message,
  orgId = null,
  actorAdminId = null,
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
      created_at: new Date()
    })
    .execute();
}
