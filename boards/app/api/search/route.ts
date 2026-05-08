import { NextRequest, NextResponse } from "next/server";
import { listQuestions } from "@/app/lib/queries";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return NextResponse.json({ results: listQuestions(request.nextUrl.searchParams) });
}
