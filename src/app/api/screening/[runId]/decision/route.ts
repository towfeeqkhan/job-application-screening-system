import { mastra } from "@/mastra";
import { connection, NextResponse } from "next/server";
import { z } from "zod";

const decisionSchema = z.object({
  decision: z.enum(["shortlist", "reject"]),
  reviewerNotes: z.string().max(2000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  await connection();

  try {
    const { runId } = await params;
    const body = await request.json();

    const parsed = decisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid recruiter decision.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const workflow = mastra.getWorkflowById("job-screening-workflow");

    // Retrieve the existing run, rather than creating a new one.
    const run = await workflow.createRun({ runId });

    const result = await run.resume({
      resumeData: parsed.data,
    });

    if (result.status === "success") {
      return NextResponse.json({
        status: "completed",
        result: result.result,
      });
    }

    if (result.status === "suspended") {
      return NextResponse.json(
        {
          status: "suspended",
          message: "The workflow is still waiting for input.",
        },
        { status: 202 },
      );
    }

    if (result.status === "failed") {
      console.error("Decision workflow failed:", result.error);

      return NextResponse.json(
        { error: "Unable to complete the screening workflow." },
        { status: 500 },
      );
    }

    return NextResponse.json({ status: result.status }, { status: 202 });
  } catch (error) {
    console.error("Recruiter decision API error:", error);

    return NextResponse.json(
      { error: "Unable to process this recruiter decision." },
      { status: 500 },
    );
  }
}
