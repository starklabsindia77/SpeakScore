import { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, string | Date, Date>;

export interface OrganizationsTable {
  id: string;
  name: string;
  schema_name: string;
  status: 'ACTIVE' | 'DISABLED' | 'PROVISIONING';
  credits_balance: number;
  feature_costs: unknown | null;
  custom_domain: string | null;
  branding_json: unknown | null; // { primaryColor, logoUrl, logoSecondaryUrl, faviconUrl }
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SSOConfigsTable {
  id: string;
  org_id: string;
  type: 'OIDC' | 'SAML';
  issuer_url: string;
  client_id: string;
  client_secret_enc: string | null; // Encrypted secret
  is_active: boolean;
  meta_json: unknown | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface IntegrationsTable {
  id: string;
  org_id: string;
  provider: 'greenhouse' | 'lever' | 'workday';
  config_json: unknown;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PlatformAdminsTable {
  id: string;
  email: string;
  password_hash: string;
  token_version: number;
  created_at: Timestamp;
  updated_at: Timestamp;
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
  level: 'INFO' | 'WARN' | 'ERROR';
  source: 'API' | 'AI' | 'AUTH' | 'SYSTEM';
  message: string;
  action: string;
  org_id: string | null;
  meta_json: unknown | null;
  impersonator_admin_id: string | null;
  created_at: Timestamp;
}

export interface SchemaMigrationsPublicTable {
  name: string;
  run_at: Timestamp;
}

export interface PlatformSettingsTable {
  key: string;
  value: unknown;
  updated_at: Timestamp;
}

export interface UsersTable {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  role: string;
  title: string | null;
  custom_role_id: string | null;
  token_version: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CustomRolesTable {
  id: string;
  name: string;
  permissions: string[];
  is_system: boolean;
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

export interface BatchesTable {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
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
  test_id: string | null;
  batch_id: string | null;
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

export interface CreditPurchasesTable {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  credits: number;
  currency: string;
  status: string;
  meta_json: unknown | null;
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
  impersonator_admin_id: string | null;
  created_at: Timestamp;
}

export interface SchemaMigrationsTenantTable {
  name: string;
  run_at: Timestamp;
}

export interface EmailTemplatesTable {
  id: string;
  org_id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
  is_default: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface NotificationsTable {
  id: string;
  org_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  data: any; // JSONB
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PasswordResetTokensTable {
  id: Generated<string>;
  user_type: 'PLATFORM_ADMIN' | 'ORG_USER';
  user_id: string;
  org_id: string | null;
  token_hash: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  created_at: Generated<Timestamp>;
}

export interface Database {
  organizations: OrganizationsTable;
  sso_configs: SSOConfigsTable;
  integrations: IntegrationsTable;
  platform_admins: PlatformAdminsTable;
  audit_logs_platform: AuditLogsPlatformTable;
  global_question_pool: GlobalQuestionPoolTable;
  schema_migrations_public: SchemaMigrationsPublicTable;
  platform_settings: PlatformSettingsTable;
  users: UsersTable;
  custom_roles: CustomRolesTable;
  tests: TestsTable;
  test_questions: TestQuestionsTable;
  batches: BatchesTable;
  candidates: CandidatesTable;
  candidate_attempts: CandidateAttemptsTable;
  responses: ResponsesTable;
  credit_usage: CreditUsageTable;
  credit_purchases: CreditPurchasesTable;
  audit_logs: AuditLogsTable;
  schema_migrations_tenant: SchemaMigrationsTenantTable;
  email_templates: EmailTemplatesTable;
  notifications: NotificationsTable;
  password_reset_tokens: PasswordResetTokensTable;
}
