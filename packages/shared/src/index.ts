import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgId: z.string().uuid().optional()
});

export const createOrgSchema = z.object({
  name: z.string().min(2),
  creditsBalance: z.number().int().min(0).default(0),
  schemaName: z
    .string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'schema must be alphanumeric/underscore and start with a letter')
    .optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional()
});

export const createUserInviteSchema = z.object({
  email: z.string().email(),
  role: z.string().min(1), // Can be a custom role name
  title: z.string().optional(),
  customRoleId: z.string().uuid().optional()
});

export const createTestSchema = z.object({
  name: z.string().min(3),
  configJson: z.any(),
  expiresAt: z.string().datetime().nullable().optional()
});

export const createBatchSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

export const createAttemptSchema = z.object({
  candidateName: z.string().min(2),
  candidateEmail: z.string().email(),
  batchId: z.string().uuid().optional(),
  testId: z.string().uuid().optional()
});

export const bulkInviteSchema = z.object({
  batchId: z.string().uuid().optional(),
  candidates: z.array(z.object({
    name: z.string().min(2),
    email: z.string().email(),
    cvData: z.any().optional() // For parsed CV data
  }))
});

export const candidateResponseSchema = z.object({
  questionId: z.string(),
  audioObjectKey: z.string()
});

export const submitAttemptSchema = z.object({
  submittedAt: z.string().datetime()
});

export const aiConfigSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'claude']),
  apiKeys: z.array(z.string()).min(1),
  model: z.string().optional(),
  projectId: z.string().optional(), // For Gemini
  region: z.string().optional() // For AWS Claude or similar if needed
});

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['INVITE', 'REMINDER', 'RESULT', 'CUSTOM']),
  subject: z.string().min(1),
  body: z.string().min(1),
  isDefault: z.boolean().default(false)
});

export const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string().or(z.date()),
  data: z.any().optional()
});

export type Permission =
  | 'view_candidates' | 'invite_candidates' | 'score_candidates'
  | 'view_tests' | 'manage_tests'
  | 'manage_users' | 'manage_roles'
  | 'view_audit_logs'
  | '*'; // Admin override

export const SYSTEM_PERMISSIONS: Permission[] = [
  'view_candidates', 'invite_candidates', 'score_candidates',
  'view_tests', 'manage_tests',
  'manage_users', 'manage_roles',
  'view_audit_logs'
];

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type CreateUserInviteInput = z.infer<typeof createUserInviteSchema>;
export type CreateTestInput = z.infer<typeof createTestSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
export type CandidateResponseInput = z.infer<typeof candidateResponseSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
export type AiConfigInput = z.infer<typeof aiConfigSchema>;
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type Notification = z.infer<typeof notificationSchema>;
