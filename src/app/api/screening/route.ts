import { mastra } from "@/mastra";
import { connection, NextResponse } from "next/server";

export async function POST(request: Request) {
  await connection();

  try {
    const body = await request.json();
    const resumeText = body.resumeText;

    if (typeof resumeText !== "string" || resumeText.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide resume text." },
        { status: 400 },
      );
    }

    const workflow = mastra.getWorkflowById("job-screening-workflow");

    const run = await workflow.createRun();

    const result = await run.start({
      inputData: {
        resumeText: resumeText.trim(),
      },
    });

    if (result.status === "suspended") {
      const review = result.suspendPayload?.["recruiter-approval"];

      return NextResponse.json({
        status: "awaiting_review",
        runId: run.runId,
        review,
      });
    }

    if (result.status === "failed") {
      console.error("Screening workflow failed:", result.error);

      return NextResponse.json(
        { error: "The screening workflow failed." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        status: result.status,
        message: "The workflow did not reach recruiter review.",
      },
      { status: 500 },
    );
  } catch (error) {
    console.error("Screening API error:", error);

    return NextResponse.json(
      { error: "Unable to screen this resume." },
      { status: 500 },
    );
  }
}
