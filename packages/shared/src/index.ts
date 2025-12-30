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

export const createAttemptSchema = z.object({
  candidateName: z.string().min(2),
  candidateEmail: z.string().email()
});

export const bulkInviteSchema = z.object({
  candidates: z.array(z.object({
    name: z.string().min(2),
    email: z.string().email()
  }))
});

export const candidateResponseSchema = z.object({
  questionId: z.string(),
  audioObjectKey: z.string()
});

export const submitAttemptSchema = z.object({
  submittedAt: z.string().datetime()
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
export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
export type CandidateResponseInput = z.infer<typeof candidateResponseSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
