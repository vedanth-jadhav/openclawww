import { NextRequest, NextResponse } from "next/server";
import { getRouterSettings, saveRouterSettings } from "@/app/lib/settings";

export const runtime = "nodejs";

export function GET() {
  const settings = getRouterSettings();
  return NextResponse.json({
    ninerouterUrl: settings.ninerouterUrl,
    ninerouterModel: settings.ninerouterModel,
    hasNinerouterKey: settings.ninerouterKey.length > 0
  });
}

export async function POST(request: NextRequest) {
  const current = getRouterSettings();
  const body = (await request.json()) as {
    ninerouterUrl?: string;
    ninerouterKey?: string;
    ninerouterModel?: string;
  };
  saveRouterSettings({
    ninerouterUrl: body.ninerouterUrl ?? "",
    ninerouterKey: body.ninerouterKey === "••••••••" ? current.ninerouterKey : body.ninerouterKey ?? "",
    ninerouterModel: body.ninerouterModel ?? "auto"
  });
  return NextResponse.json({ ok: true });
}
