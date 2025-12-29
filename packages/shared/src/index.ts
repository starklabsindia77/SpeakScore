import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const createOrgSchema = z.object({
  name: z.string().min(2),
  creditsBalance: z.number().int().min(0).default(0)
});

export const createUserInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ORG_ADMIN', 'RECRUITER'])
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

export const candidateResponseSchema = z.object({
  questionId: z.string(),
  audioObjectKey: z.string()
});

export const submitAttemptSchema = z.object({
  submittedAt: z.string().datetime()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type CreateUserInviteInput = z.infer<typeof createUserInviteSchema>;
export type CreateTestInput = z.infer<typeof createTestSchema>;
export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
export type CandidateResponseInput = z.infer<typeof candidateResponseSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
