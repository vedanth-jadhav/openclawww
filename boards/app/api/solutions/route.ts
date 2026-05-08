import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ensureDatabase } from "@/app/lib/migrate";
import { sqlite } from "@/app/lib/db";
import { getRouterSettings } from "@/app/lib/settings";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    ensureDatabase();
    const { questionId } = (await request.json()) as { questionId?: string };
    if (!questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    const existing = sqlite
      .prepare("SELECT content_markdown AS contentMarkdown FROM solutions WHERE question_id = ? AND source = 'ai_draft'")
      .get(questionId) as { contentMarkdown: string } | null;
    if (existing) return NextResponse.json({ source: "ai_draft", contentMarkdown: existing.contentMarkdown });

    const question = sqlite
      .prepare("SELECT canonical_text AS canonicalText, markdown FROM questions WHERE id = ?")
      .get(questionId) as { canonicalText: string; markdown: string } | null;
    if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const contentMarkdown = await draftSolution(question.canonicalText, question.markdown);
    sqlite
      .prepare(
        "INSERT INTO solutions (id, question_id, source, content_markdown, verified) VALUES (?, ?, 'ai_draft', ?, 0)"
      )
      .run(randomUUID(), questionId, contentMarkdown);
    return NextResponse.json({ source: "ai_draft", contentMarkdown });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Solution generation failed." },
      { status: 500 }
    );
  }
}

async function draftSolution(canonicalText: string, markdown: string) {
  const settings = getRouterSettings();
  const baseUrl = settings.ninerouterUrl;
  if (!baseUrl) {
    return "AI draft unavailable: add 9Router details in Settings first.";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "content-type": "application/json",
      ...(settings.ninerouterKey ? { authorization: `Bearer ${settings.ninerouterKey}` } : {})
    },
    body: JSON.stringify({
      model: settings.ninerouterModel || "auto",
      messages: [
        {
          role: "system",
          content:
            "Draft a concise Class 12 board-exam solution. If the question lacks enough data, say what is missing. Use Markdown."
        },
        { role: "user", content: `${canonicalText}\n\n${markdown}` }
      ]
    })
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const message = await response.text();
    return `AI draft failed through 9Router (${response.status}). ${message || "Check NINEROUTER_URL/NINEROUTER_KEY."}`;
  }

  const text = await response.text();
  if (!text) return "AI draft returned an empty response.";
  return parseRouterContent(text);
}

function parseRouterContent(text: string) {
  if (text.trimStart().startsWith("data:")) {
    const chunks = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== "[DONE]");
    const content = chunks
      .map((chunk) => {
        try {
          const payload = JSON.parse(chunk) as {
            choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
          };
          return payload.choices?.[0]?.delta?.content ?? payload.choices?.[0]?.message?.content ?? "";
        } catch {
          return "";
        }
      })
      .join("")
      .trim();
    return content || "AI draft returned no content.";
  }

  const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content?.trim() || "AI draft returned no content.";
}
