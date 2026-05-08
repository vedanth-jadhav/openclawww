import { NextResponse } from "next/server";
import { getTrends } from "@/app/lib/queries";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getTrends());
}
