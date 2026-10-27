"use client";

import { useState } from "react";

type Candidate = {
  name: string;
  email: string | null;
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
};

type Evaluation = {
  score: number;
  strengths: string[];
  gaps: string[];
  evidence: string[];
  explanation: string;
};

type EmailDraft = {
  subject: string;
  body: string;
};

type ScreeningResponse = {
  status?: string;
  runId?: string;
  review?: {
    message: string;
    candidate: Candidate;
    evaluation: Evaluation;
  };
  error?: string;
};

type DecisionResponse = {
  status?: string;
  result?: {
    decision: {
      decision: "shortlist" | "reject";
      reviewerNotes?: string;
    };
    emailDraft: EmailDraft;
  };
  error?: string;
};

function ReviewList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "success" | "warning" | "neutral";
}) {
  const styles = {
    success: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    neutral: "bg-gray-50 border-gray-200",
  };

  const bulletStyles = {
    success: "text-green-700",
    warning: "text-amber-700",
    neutral: "text-gray-500",
  };

  return (
    <section className={`rounded-xl border p-5 ${styles[variant]}`}>
      <h3 className="font-semibold text-gray-900">{title}</h3>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {items.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className="flex gap-2 text-sm leading-6 text-gray-700"
            >
              <span className={bulletStyles[variant]}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-600">No items provided.</p>
      )}
    </section>
  );
}

export default function ScreeningPage() {
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ScreeningResponse | null>(null);
  const [error, setError] = useState("");

  const [decision, setDecision] = useState<"shortlist" | "reject" | null>(null);

  const [reviewerNotes, setReviewerNotes] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResponse(null);
    setDecision(null);
    setReviewerNotes("");
    setDecisionError("");
    setEmailDraft(null);
    setCopyMessage("");

    try {
      const res = await fetch("/api/screening", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeText }),
      });

      const data: ScreeningResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Unable to screen this resume.");
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(selectedDecision: "shortlist" | "reject") {
    if (!response?.runId) {
      setDecisionError("Workflow run ID is missing.");
      return;
    }

    if (decisionLoading || decision !== null) {
      return;
    }

    setDecisionLoading(true);
    setDecisionError("");
    setCopyMessage("");

    try {
      const res = await fetch(`/api/screening/${response.runId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision: selectedDecision,
          reviewerNotes: reviewerNotes.trim(),
        }),
      });

      const data: DecisionResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Unable to submit recruiter decision.");
      }

      if (data.status !== "completed" || !data.result?.emailDraft) {
        throw new Error(
          "The workflow did not return the expected email draft.",
        );
      }

      setDecision(selectedDecision);
      setEmailDraft(data.result.emailDraft);
    } catch (err) {
      setDecisionError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setDecisionLoading(false);
    }
  }

  async function handleCopyEmail() {
    if (!emailDraft) return;

    try {
      await navigator.clipboard.writeText(
        `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`,
      );
      setCopyMessage("Email draft copied to clipboard.");
    } catch {
      setCopyMessage(
        "Unable to copy automatically. Select and copy the email text manually.",
      );
    }
  }

  const review = response?.review;
  const candidate = review?.candidate;
  const evaluation = review?.evaluation;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Page heading */}
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            AI Recruiting
          </p>

          <h1 className="mt-2 text-3xl font-bold">Job Application Screening</h1>

          <p className="mt-3 text-gray-600">
            Review candidate qualifications against the Junior Full-Stack
            Developer job description.
          </p>
        </header>

        {/* Resume submission */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
        >
          <label htmlFor="resume" className="block font-semibold">
            Candidate resume
          </label>

          <textarea
            id="resume"
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste the candidate's resume text here..."
            rows={9}
            required
            disabled={loading || decisionLoading}
            className="w-full resize-y rounded-lg border border-gray-300 p-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              {resumeText.trim().length} characters
            </p>

            <button
              type="submit"
              disabled={loading || decisionLoading || !resumeText.trim()}
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Screening resume..." : "Screen Resume"}
            </button>
          </div>
        </form>

        {/* Loading state */}
        {loading && (
          <p role="status" className="text-sm text-gray-600">
            Parsing and evaluating the resume...
          </p>
        )}

        {/* Screening errors */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Candidate review dashboard */}
        {review && candidate && evaluation && (
          <div className="space-y-6">
            {/* Candidate profile */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Candidate profile</p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {candidate.name || "Name not provided"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    {candidate.email ?? "Email not provided"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    decision
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {decision ? "Decision recorded" : "Awaiting recruiter review"}
                </span>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Education</h3>

                  {candidate.education.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
                      {candidate.education.map((item, i) => (
                        <li key={`${i}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Not documented</p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold">Experience</h3>

                  {candidate.experience.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
                      {candidate.experience.map((item, i) => (
                        <li key={`${i}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Not documented in the resume
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold">Skills</h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.skills.length > 0 ? (
                    candidate.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-sm text-blue-800"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No skills extracted.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold">Projects</h3>

                {candidate.projects.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc space-y-2 text-sm leading-6 text-gray-600">
                    {candidate.projects.map((project, i) => (
                      <li key={`${i}-${project}`}>{project}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    No projects documented.
                  </p>
                )}
              </div>
            </section>

            {/* Evaluation score */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Candidate evaluation</h2>

                  <p className="mt-1 text-sm text-gray-500">
                    AI-generated, job-related assessment
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-700">
                    {evaluation.score}
                    <span className="text-lg text-gray-400">/100</span>
                  </p>

                  <p className="text-xs text-gray-500">Advisory score</p>
                </div>
              </div>

              <div
                className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-label="Evaluation score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.max(0, Math.min(100, evaluation.score))}
              >
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, evaluation.score))}%`,
                  }}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-700">
                {evaluation.explanation}
              </p>
            </section>

            {/* Strengths and gaps */}
            <div className="grid gap-5 md:grid-cols-2">
              <ReviewList
                title="Strengths"
                items={evaluation.strengths}
                variant="success"
              />

              <ReviewList
                title="Gaps / Not Documented"
                items={evaluation.gaps}
                variant="warning"
              />
            </div>

            {/* Evidence */}
            <ReviewList
              title="Resume Evidence"
              items={evaluation.evidence}
              variant="neutral"
            />

            {/* Recruiter decision */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Recruiter decision</h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Review the qualifications and supporting evidence. The AI score
                is advisory; you make the final decision.
              </p>

              <label
                htmlFor="reviewerNotes"
                className="mt-5 block text-sm font-semibold"
              >
                Reviewer notes (optional)
              </label>

              <textarea
                id="reviewerNotes"
                value={reviewerNotes}
                onChange={(event) => setReviewerNotes(event.target.value)}
                disabled={decisionLoading || decision !== null}
                rows={3}
                maxLength={2000}
                placeholder="Record your job-related reasoning..."
                className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />

              {decisionError && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                  {decisionError}
                </p>
              )}

              {!decision && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecision("shortlist")}
                    disabled={decisionLoading}
                    className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {decisionLoading ? "Processing..." : "Shortlist Candidate"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision("reject")}
                    disabled={decisionLoading}
                    className="rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {decisionLoading ? "Processing..." : "Reject Candidate"}
                  </button>
                </div>
              )}

              {decision && (
                <p className="mt-4 text-sm font-medium text-gray-700">
                  Recruiter decision:{" "}
                  {decision === "shortlist" ? "Shortlisted" : "Rejected"}
                </p>
              )}
            </section>

            {/* Generated email draft */}
            {emailDraft && (
              <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold">Generated email draft</h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Review this message before using it. No email has been sent.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="emailSubject"
                    className="text-sm font-semibold"
                  >
                    Subject
                  </label>

                  <input
                    id="emailSubject"
                    value={emailDraft.subject}
                    readOnly
                    className="mt-2 w-full rounded-lg border bg-gray-50 p-3 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="emailBody" className="text-sm font-semibold">
                    Email body
                  </label>

                  <textarea
                    id="emailBody"
                    value={emailDraft.body}
                    readOnly
                    rows={9}
                    className="mt-2 w-full rounded-lg border bg-gray-50 p-3 text-sm leading-6"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50"
                >
                  Copy email draft
                </button>

                {copyMessage && (
                  <p role="status" className="text-sm text-gray-600">
                    {copyMessage}
                  </p>
                )}
              </section>
            )}

            <p className="text-xs leading-5 text-gray-500">
              AI-generated evaluations are advisory. Make an independent,
              job-related hiring decision. Missing information should not
              automatically be treated as a lack of ability.
            </p>

            <p className="text-xs text-gray-400">
              Workflow run ID: {response.runId}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
