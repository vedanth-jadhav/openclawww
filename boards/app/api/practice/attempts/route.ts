import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ensureDatabase } from "@/app/lib/migrate";
import { sqlite } from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET() {
  ensureDatabase();
  const attempts = sqlite
    .prepare(
      `SELECT id, mode, started_at AS startedAt, completed_at AS completedAt, total_questions AS totalQuestions,
              correct_count AS correctCount, wrong_count AS wrongCount, skipped_count AS skippedCount, total_seconds AS totalSeconds
       FROM practice_attempts
       ORDER BY started_at DESC
       LIMIT 20`
    )
    .all();
  return NextResponse.json({ attempts });
}

export async function POST(request: NextRequest) {
  ensureDatabase();
  const body = (await request.json()) as {
    mode: string;
    responses: Array<{ questionId: string; selectedOption?: string; correctOption?: string; status: string; secondsSpent: number }>;
    totalSeconds: number;
  };
  const attemptId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const correct = body.responses.filter((response) => response.status === "correct").length;
  const wrong = body.responses.filter((response) => response.status === "wrong").length;
  const skipped = body.responses.filter((response) => response.status === "skipped").length;

  const save = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO practice_attempts
         (id, mode, started_at, completed_at, total_questions, correct_count, wrong_count, skipped_count, total_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(attemptId, body.mode, now - body.totalSeconds, now, body.responses.length, correct, wrong, skipped, body.totalSeconds);
    for (const response of body.responses) {
      sqlite
        .prepare(
          `INSERT INTO practice_responses
           (id, attempt_id, question_id, selected_option, correct_option, status, seconds_spent)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          randomUUID(),
          attemptId,
          response.questionId,
          response.selectedOption ?? null,
          response.correctOption ?? null,
          response.status,
          response.secondsSpent
        );
    }
  });
  save();
  return NextResponse.json({ attemptId });
}
