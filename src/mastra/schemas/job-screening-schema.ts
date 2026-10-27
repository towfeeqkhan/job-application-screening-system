import { z } from "zod";

export const resumeSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  skills: z.array(z.string()),
  experience: z.array(z.string()),
  education: z.array(z.string()),
  projects: z.array(z.string()),
});

export const evaluationSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  evidence: z.array(z.string()),
  explanation: z.string(),
});

export const recruiterDecisionSchema = z.object({
  decision: z.enum(["shortlist", "reject"]),
  reviewerNotes: z.string().optional(),
});

export const emailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type ResumeData = z.infer<typeof resumeSchema>;
export type CandidateEvaluation = z.infer<typeof evaluationSchema>;
export type RecruiterDecision = z.infer<typeof recruiterDecisionSchema>;
export type EmailDraft = z.infer<typeof emailDraftSchema>;
