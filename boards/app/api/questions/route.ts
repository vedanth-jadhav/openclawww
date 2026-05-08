import { NextRequest, NextResponse } from "next/server";
import { getOccurrences, listQuestions, type QuestionRow } from "@/app/lib/queries";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const questions = listQuestions(request.nextUrl.searchParams).map((question: QuestionRow) => ({
    ...question,
    occurrences: getOccurrences(question.id)
  }));
  return NextResponse.json({ questions });
}
