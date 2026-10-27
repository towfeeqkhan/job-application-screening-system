import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { resumeParserAgent } from "@/mastra/agents/resume-parser-agent";
import { candidateEvaluatorAgent } from "@/mastra/agents/candidate-evaluator-agent";

import {
  resumeSchema,
  evaluationSchema,
  recruiterDecisionSchema,
  emailDraftSchema,
} from "@/mastra/schemas/job-screening-schema";
import { JOB_DESCRIPTION } from "@/mastra/data/job-description";
import { emailDraftAgent } from "../agents/email-draft-agent";

// STEP 1: Parse the pasted resume text
const parseResumeStep = createStep({
  id: "parse-resume",

  inputSchema: z.object({
    resumeText: z.string().min(1, "Resume text cannot be empty"),
  }),

  outputSchema: z.object({
    resume: resumeSchema,
  }),

  execute: async ({ inputData }) => {
    const result = await resumeParserAgent.generate(
      `Extract structured information from this resume:\n\n${inputData.resumeText}`,
      {
        structuredOutput: {
          schema: resumeSchema,
          jsonPromptInjection: true,
        },
      },
    );

    return {
      resume: result.object,
    };
  },
});

// STEP 2: Evaluate the parsed resume
const evaluateCandidateStep = createStep({
  id: "evaluate-candidate",

  inputSchema: z.object({
    resume: resumeSchema,
  }),

  outputSchema: z.object({
    resume: resumeSchema,
    evaluation: evaluationSchema,
  }),

  execute: async ({ inputData }) => {
    const result = await candidateEvaluatorAgent.generate(
      `
Evaluate this candidate against the job description.

JOB DESCRIPTION:
${JOB_DESCRIPTION}

PARSED RESUME:
${JSON.stringify(inputData.resume, null, 2)}
`,
      {
        structuredOutput: {
          schema: evaluationSchema,
          jsonPromptInjection: true,
        },
      },
    );

    return {
      resume: inputData.resume,
      evaluation: result.object,
    };
  },
});

const recruiterApprovalStep = createStep({
  id: "recruiter-approval",

  inputSchema: z.object({
    resume: resumeSchema,
    evaluation: evaluationSchema,
  }),

  suspendSchema: z.object({
    message: z.string(),
    candidate: resumeSchema,
    evaluation: evaluationSchema,
  }),

  resumeSchema: recruiterDecisionSchema,

  outputSchema: z.object({
    resume: resumeSchema,
    evaluation: evaluationSchema,
    decision: recruiterDecisionSchema,
  }),

  execute: async ({ inputData, resumeData, suspend }) => {
    // First execution: pause and request a recruiter decision.
    if (!resumeData) {
      return await suspend({
        message: "Recruiter review required before proceeding.",
        candidate: inputData.resume,
        evaluation: inputData.evaluation,
      });
    }

    // Resumed execution: continue using the recruiter's decision.
    return {
      resume: inputData.resume,
      evaluation: inputData.evaluation,
      decision: resumeData,
    };
  },
});

const draftEmailStep = createStep({
  id: "draft-email",

  inputSchema: z.object({
    resume: resumeSchema,
    evaluation: evaluationSchema,
    decision: recruiterDecisionSchema,
  }),

  outputSchema: z.object({
    resume: resumeSchema,
    evaluation: evaluationSchema,
    decision: recruiterDecisionSchema,
    emailDraft: emailDraftSchema,
  }),

  execute: async ({ inputData }) => {
    const { resume, evaluation, decision } = inputData;

    const result = await emailDraftAgent.generate(
      `
Draft an email for this job application.

CANDIDATE:
${JSON.stringify(resume, null, 2)}

EVALUATION:
${JSON.stringify(evaluation, null, 2)}

RECRUITER DECISION:
${JSON.stringify(decision, null, 2)}

Instructions:
- For shortlist, draft an interview invitation.
- For reject, draft a respectful rejection email.
- Do not invent interview dates, times, or other commitments.
- Do not disclose the internal evaluation score.
- Return the email subject and body only.
`,
      {
        structuredOutput: {
          schema: emailDraftSchema,
          jsonPromptInjection: true,
        },
      },
    );

    return {
      resume,
      evaluation,
      decision,
      emailDraft: result.object,
    };
  },
});

// CONNECT THE STEPS

export const jobScreeningWorkflow = createWorkflow({
  id: "job-screening-workflow",

  inputSchema: z.object({
    resumeText: z.string().min(1),
  }),

  outputSchema: z.object({
    resume: resumeSchema,
    evaluation: evaluationSchema,
    decision: recruiterDecisionSchema,
    emailDraft: emailDraftSchema,
  }),
})
  .then(parseResumeStep)
  .then(evaluateCandidateStep)
  .then(recruiterApprovalStep)
  .then(draftEmailStep)
  .commit();
