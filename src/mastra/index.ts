import { Mastra } from "@mastra/core";
import { resumeParserAgent } from "./agents/resume-parser-agent";
import { candidateEvaluatorAgent } from "./agents/candidate-evaluator-agent";
import { jobScreeningWorkflow } from "./workflows/job-screening-workflow";
import { LibSQLStore } from "@mastra/libsql";
import { emailDraftAgent } from "./agents/email-draft-agent";

export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: "job-screening-storage",
    url: "file:./mastra.db",
  }),

  agents: {
    resumeParserAgent,
    candidateEvaluatorAgent,
    emailDraftAgent,
  },

  workflows: {
    jobScreeningWorkflow,
  },
});
