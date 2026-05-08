import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { ensureDatabase } from "@/app/lib/migrate";
import { sqlite } from "@/app/lib/db";

type ExtractedQuestion = {
  questionNumber: string;
  text: string;
  marks: number;
  questionType: string;
  confidence: number;
  needsReview: boolean;
  officialAnswer?: string;
};

type ExtractedPaper = {
  paper: {
    id: string;
    subject: string;
    subjectName: string;
    year: number;
    setName: string;
    paperType: string;
    sourceUrl: string;
    filePath: string;
    language: string;
    trustLevel: string;
  };
  questions: ExtractedQuestion[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

function splitInlineOptions(line: string) {
  const markerPattern = /(?:^|\s)([A-D][.)])\s+/g;
  const matches = [...line.matchAll(markerPattern)];
  if (matches.length < 2) return [line];

  const parts: string[] = [];
  const prefix = line.slice(0, matches[0].index ?? 0).trim();
  if (prefix) parts.push(prefix);

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? line.length : line.length;
    parts.push(line.slice(start, end).trim());
  });
  return parts.filter(Boolean);
}

function isOptionLine(line: string) {
  return /^\(?[A-D]\)?[.)]?\s+.+$/i.test(line);
}

function removeVisibleMarkSuffix(line: string) {
  return line.replace(/\s+[1-6]\s*$/, "").replace(/\s*:\s*$/, ":").trim();
}

function formatQuestionText(value: string) {
  const expandedLines = value
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .flatMap(splitInlineOptions)
    .map((line, index) => {
      let next = index === 0 ? line.replace(/^(?:Q\.?\s*)?\d{1,2}[.)]\s+/, "") : line;
      if (next.length > 80) next = next.replace(/\s+[1-6]\s*$/, "");
      return next.trim();
    })
    .filter(Boolean);
  const lines = expandedLines.map((line, index) => (isOptionLine(expandedLines[index + 1] ?? "") ? removeVisibleMarkSuffix(line) : line));
  return lines.join("\n");
}

function readJsonFiles(dir: string): ExtractedPaper[] {
  const files = readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return readdirSync(fullPath).filter((name) => name.endsWith(".json")).map((name) => path.join(fullPath, name));
    return entry.name.endsWith(".json") ? [fullPath] : [];
  });
  return files
    .map((file) => JSON.parse(readFileSync(file, "utf-8")) as Partial<ExtractedPaper>)
    .filter((paper): paper is ExtractedPaper => Boolean(paper.paper && Array.isArray(paper.questions)));
}

const sourceDir = process.argv[2] ?? "pipeline/extracted";
const papers = readJsonFiles(sourceDir).filter((paper) => paper.questions.length > 0);

ensureDatabase();

sqlite.transaction(() => {
  sqlite.exec(`
    DELETE FROM questions_fts;
    DELETE FROM practice_responses;
    DELETE FROM practice_attempts;
    DELETE FROM solutions;
    DELETE FROM question_occurrences;
    DELETE FROM questions;
    DELETE FROM question_clusters;
    DELETE FROM papers;
    DELETE FROM topics;
    DELETE FROM chapters;
    DELETE FROM subjects;
  `);

      const clusterStats = new Map<string, { id: string; canonical: string; repeatCount: number; firstYear: number; lastYear: number }>();

  for (const extracted of papers) {
    const subjectId = slugify(extracted.paper.subject);
    const chapterId = `${subjectId}-unclassified`;
    const topicId = `${chapterId}-needs-classification`;

    sqlite.prepare("INSERT OR IGNORE INTO subjects (id, name, short_code) VALUES (?, ?, ?)").run(
      subjectId,
      extracted.paper.subjectName,
      subjectId.slice(0, 8).toUpperCase()
    );
    sqlite.prepare("INSERT OR IGNORE INTO chapters (id, subject_id, number, name) VALUES (?, ?, ?, ?)").run(
      chapterId,
      subjectId,
      0,
      "Needs classification"
    );
    sqlite.prepare("INSERT OR IGNORE INTO topics (id, chapter_id, name, slug) VALUES (?, ?, ?, ?)").run(
      topicId,
      chapterId,
      "Needs classification",
      "needs-classification"
    );
    sqlite
      .prepare(
        "INSERT OR REPLACE INTO papers (id, subject_id, year, set_name, paper_type, source_url, file_path, language, trust_level, verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())"
      )
      .run(
        extracted.paper.id,
        subjectId,
        extracted.paper.year,
        extracted.paper.setName,
        extracted.paper.paperType,
        extracted.paper.sourceUrl,
        extracted.paper.filePath,
        extracted.paper.language,
        extracted.paper.trustLevel
      );

    extracted.questions.forEach((item, index) => {
      const formattedText = formatQuestionText(item.text);
      const normalized = normalizeQuestion(formattedText);
      const clusterId = `cluster-${normalized.slice(0, 80).replace(/\s+/g, "-") || item.questionNumber}`;
      const existing = clusterStats.get(clusterId);
      clusterStats.set(clusterId, {
        id: clusterId,
        canonical: existing?.canonical ?? formattedText,
        repeatCount: (existing?.repeatCount ?? 0) + 1,
        firstYear: Math.min(existing?.firstYear ?? extracted.paper.year, extracted.paper.year),
        lastYear: Math.max(existing?.lastYear ?? extracted.paper.year, extracted.paper.year)
      });
      sqlite
        .prepare(
        "INSERT OR IGNORE INTO question_clusters (id, canonical_text, normalized_text, repeat_count, first_year, last_year, similarity_method, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .run(clusterId, formattedText, normalized, 1, extracted.paper.year, extracted.paper.year, "exact-normalized", 1);

      const questionId = `${extracted.paper.id}-q${item.questionNumber.replace(/[^a-zA-Z0-9]+/g, "-")}-${index + 1}`;
      sqlite
        .prepare(
          "INSERT OR REPLACE INTO questions (id, subject_id, chapter_id, topic_id, cluster_id, canonical_text, markdown, question_type, marks, difficulty, extraction_confidence, needs_review) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          questionId,
          subjectId,
          chapterId,
          topicId,
          clusterId,
          formattedText,
          formattedText,
          item.questionType,
          item.marks,
          "medium",
          item.confidence,
          item.needsReview ? 1 : 0
        );
      sqlite
        .prepare(
          "INSERT OR REPLACE INTO question_occurrences (id, question_id, paper_id, year, question_number, original_text, wording_delta, marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(`${questionId}-occurrence`, questionId, extracted.paper.id, extracted.paper.year, item.questionNumber, formattedText, null, item.marks);
      if (item.officialAnswer) {
        sqlite
          .prepare(
            "INSERT OR REPLACE INTO solutions (id, question_id, source, content_markdown, source_url, verified) VALUES (?, ?, 'official', ?, ?, 1)"
          )
          .run(`${questionId}-official`, questionId, item.officialAnswer, extracted.paper.sourceUrl);
      }
    });
  }

  for (const cluster of clusterStats.values()) {
    sqlite
      .prepare(
        "INSERT OR REPLACE INTO question_clusters (id, canonical_text, normalized_text, repeat_count, first_year, last_year, similarity_method, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        cluster.id,
        cluster.canonical,
        normalizeQuestion(cluster.canonical),
        cluster.repeatCount,
        cluster.firstYear,
        cluster.lastYear,
        "exact-normalized",
        1
      );
  }

  sqlite
    .prepare(
      `INSERT INTO questions_fts (question_id, canonical_text, markdown, topic, chapter, subject, solution)
       SELECT q.id, q.canonical_text, q.markdown, COALESCE(t.name, ''), c.name, s.name, ''
       FROM questions q
       JOIN chapters c ON c.id = q.chapter_id
       JOIN subjects s ON s.id = q.subject_id
       LEFT JOIN topics t ON t.id = q.topic_id`
    )
    .run();
})();

console.log(`Imported ${papers.length} official extracted paper(s) into data/boards.sqlite`);
