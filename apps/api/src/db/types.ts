import { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, string | Date, Date>;

export interface OrganizationsTable {
  id: string;
  name: string;
  schema_name: string;
  status: 'active' | 'inactive' | 'provisioning';
  credits_balance: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PlatformAdminsTable {
  id: string;
  email: string;
  password_hash: string;
  role: 'SUPER_ADMIN';
  created_at: Timestamp;
}

export interface GlobalQuestionPoolTable {
  id: string;
  type: string;
  prompt: string;
  meta_json: unknown | null;
  is_active: boolean;
  created_at: Timestamp;
}

export interface AuditLogsPlatformTable {
  id: Generated<string>;
  actor_admin_id: string | null;
  action: string;
  meta_json: unknown | null;
  created_at: Timestamp;
}

export interface SchemaMigrationsPublicTable {
  name: string;
  run_at: Timestamp;
}

export interface UsersTable {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  role: 'ORG_ADMIN' | 'RECRUITER';
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TestsTable {
  id: string;
  org_id: string;
  name: string;
  config_json: unknown;
  expires_at: Timestamp | null;
  is_active: boolean;
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TestQuestionsTable {
  id: string;
  org_id: string | null;
  type: string;
  prompt: string;
  meta_json: unknown | null;
  is_active: boolean;
  created_at: Timestamp;
}

export interface CandidatesTable {
  id: string;
  org_id: string;
  test_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'INVITED' | 'STARTED' | 'SUBMITTED' | 'SCORED' | 'EXPIRED';
  overall_score: number | null;
  decision: 'PASS' | 'BORDERLINE' | 'FAIL' | null;
  started_at: Timestamp | null;
  submitted_at: Timestamp | null;
  scored_at: Timestamp | null;
  created_at: Timestamp;
}

export interface CandidateAttemptsTable {
  id: string;
  org_id: string;
  test_id: string;
  candidate_id: string;
  token_hash: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  created_at: Timestamp;
}

export interface ResponsesTable {
  id: string;
  org_id: string;
  attempt_id: string;
  candidate_id: string;
  question_id: string;
  audio_object_key: string;
  transcript: string | null;
  scores_json: unknown | null;
  confidence: number | null;
  relevance_score: number | null;
  flagged_reason: string | null;
  flagged_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CreditUsageTable {
  id: string;
  org_id: string;
  candidate_id: string;
  attempt_id: string;
  credits_used: number;
  used_at: Timestamp;
}

export interface AuditLogsTable {
  id: string;
  org_id: string;
  actor_user_id: string | null;
  action: string;
  meta_json: unknown | null;
  created_at: Timestamp;
}

export interface SchemaMigrationsTenantTable {
  name: string;
  run_at: Timestamp;
}

export interface Database {
  organizations: OrganizationsTable;
  platform_admins: PlatformAdminsTable;
  audit_logs_platform: AuditLogsPlatformTable;
  global_question_pool: GlobalQuestionPoolTable;
  schema_migrations_public: SchemaMigrationsPublicTable;
  users: UsersTable;
  tests: TestsTable;
  test_questions: TestQuestionsTable;
  candidates: CandidatesTable;
  candidate_attempts: CandidateAttemptsTable;
  responses: ResponsesTable;
  credit_usage: CreditUsageTable;
  audit_logs: AuditLogsTable;
  schema_migrations_tenant: SchemaMigrationsTenantTable;
}
