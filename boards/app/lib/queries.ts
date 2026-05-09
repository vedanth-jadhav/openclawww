import { ensureDatabase } from "@/app/lib/migrate";
import { sqlite } from "@/app/lib/db";

export type QuestionRow = {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicName: string | null;
  clusterId: string | null;
  canonicalText: string;
  markdown: string;
  questionType: string;
  marks: number;
  difficulty: string;
  repeatCount: number;
  firstYear: number | null;
  lastYear: number | null;
  needsReview: number;
  options: string | null;
  renderHint: string | null;
  questionData: string | null;
  tableData: string | null;
  imagePath: string | null;
  imageAltText: string | null;
  officialSolution: string | null;
  aiSolution: string | null;
};

const baseQuestionSql = `
  SELECT
    q.id,
    q.subject_id AS subjectId,
    s.name AS subjectName,
    q.chapter_id AS chapterId,
    c.name AS chapterName,
    t.name AS topicName,
    q.cluster_id AS clusterId,
    q.canonical_text AS canonicalText,
    q.markdown,
    q.question_type AS questionType,
    q.marks,
    q.difficulty,
    COALESCE(qc.repeat_count, 1) AS repeatCount,
    qc.first_year AS firstYear,
    qc.last_year AS lastYear,
    q.needs_review AS needsReview,
    q.options,
    q.render_hint AS renderHint,
    q.question_data AS questionData,
    q.table_data AS tableData,
    q.image_path AS imagePath,
    q.image_alt_text AS imageAltText,
    MAX(CASE WHEN sol.source = 'official' THEN sol.content_markdown END) AS officialSolution,
    MAX(CASE WHEN sol.source = 'ai_draft' THEN sol.content_markdown END) AS aiSolution
  FROM questions q
  JOIN subjects s ON s.id = q.subject_id
  JOIN chapters c ON c.id = q.chapter_id
  LEFT JOIN topics t ON t.id = q.topic_id
  LEFT JOIN question_clusters qc ON qc.id = q.cluster_id
  LEFT JOIN solutions sol ON sol.question_id = q.id
`;

export function listQuestions(searchParams: URLSearchParams) {
  ensureDatabase();
  const subject = searchParams.get("subject");
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const filters: string[] = [];
  const values: unknown[] = [];

  filters.push("COALESCE(q.status, 'active') = 'active'");
  if (searchParams.get("review") !== "include") {
    filters.push("COALESCE(q.needs_review, 0) = 0");
    filters.push("q.render_hint IS NULL");
  }

  if (subject && subject !== "all") {
    filters.push("q.subject_id = ?");
    values.push(subject);
  }
  if (type && type !== "all") {
    filters.push("q.question_type = ?");
    values.push(type);
  }
  const marks = searchParams.get("marks");
  if (marks && marks !== "all") {
    filters.push("q.marks = ?");
    values.push(Number(marks));
  }
  if (search) {
    filters.push(
      "q.id IN (SELECT question_id FROM questions_fts WHERE questions_fts MATCH ? ORDER BY rank)"
    );
    values.push(search);
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  return sqlite
    .prepare(
      `${baseQuestionSql}
       ${where}
       GROUP BY q.id
       ORDER BY q.marks ASC, q.id
       LIMIT 80`
    )
    .all(...values) as QuestionRow[];
}

export function getOccurrences(questionId: string) {
  ensureDatabase();
  return sqlite
    .prepare(
      `SELECT o.id, o.year, o.question_number AS questionNumber, o.original_text AS originalText,
              o.wording_delta AS wordingDelta, o.marks, p.set_name AS setName, p.source_url AS sourceUrl
       FROM question_occurrences o
       JOIN papers p ON p.id = o.paper_id
       WHERE o.question_id = ?
       ORDER BY o.year DESC`
    )
    .all(questionId);
}

export function getTrends() {
  ensureDatabase();
  const totals = sqlite
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM questions WHERE COALESCE(status, 'active') = 'active' AND COALESCE(needs_review, 0) = 0 AND render_hint IS NULL) AS questions,
         (SELECT COALESCE(SUM(COALESCE(qc.repeat_count, 1)), 0)
            FROM questions q
           LEFT JOIN question_clusters qc ON qc.id = q.cluster_id
           WHERE COALESCE(q.status, 'active') = 'active'
             AND COALESCE(q.needs_review, 0) = 0
             AND q.render_hint IS NULL) AS weightedRepeats,
         (SELECT COUNT(*) FROM papers) AS papers,
         (SELECT COUNT(DISTINCT q.cluster_id)
            FROM questions q
            LEFT JOIN question_clusters qc ON qc.id = q.cluster_id
           WHERE q.cluster_id IS NOT NULL
             AND COALESCE(q.status, 'active') = 'active'
             AND COALESCE(q.needs_review, 0) = 0
             AND q.render_hint IS NULL
             AND COALESCE(qc.repeat_count, 1) > 1) AS repeatedClusters`
    )
    .get();
  const chapters = sqlite
    .prepare(
      `SELECT s.name AS subject, c.name AS chapter, COUNT(q.id) AS questions, COALESCE(SUM(qc.repeat_count), COUNT(q.id)) AS appearances
       FROM questions q
       JOIN subjects s ON s.id = q.subject_id
       JOIN chapters c ON c.id = q.chapter_id
       LEFT JOIN question_clusters qc ON qc.id = q.cluster_id
       WHERE COALESCE(q.status, 'active') = 'active'
         AND COALESCE(q.needs_review, 0) = 0
         AND q.render_hint IS NULL
       GROUP BY c.id
       ORDER BY appearances DESC`
    )
    .all();
  const topClusters = sqlite
    .prepare(
      `SELECT qc.id, qc.canonical_text AS canonicalText, qc.repeat_count AS repeatCount, qc.first_year AS firstYear, qc.last_year AS lastYear, qc.confidence
       FROM question_clusters qc
       WHERE qc.repeat_count > 1
         AND EXISTS (
           SELECT 1 FROM questions q
           WHERE q.cluster_id = qc.id
             AND COALESCE(q.status, 'active') = 'active'
             AND COALESCE(q.needs_review, 0) = 0
             AND q.render_hint IS NULL
         )
       ORDER BY qc.repeat_count DESC, qc.confidence DESC
       LIMIT 10`
    )
    .all();
  const marksByYear = sqlite
    .prepare(
      `SELECT year, SUM(marks) AS marks, COUNT(*) AS appearances
       FROM question_occurrences
       GROUP BY year
       ORDER BY year DESC`
    )
    .all();
  const marksBreakdown = getMarksBreakdown();

  return { totals, chapters, topClusters, marksByYear, marksBreakdown };
}

export function getMarksBreakdown() {
  ensureDatabase();
  return sqlite
    .prepare(
      `SELECT marks, COUNT(*) AS questions
       FROM questions
       WHERE COALESCE(status, 'active') = 'active'
         AND COALESCE(needs_review, 0) = 0
         AND render_hint IS NULL
       GROUP BY marks
       ORDER BY marks`
    )
    .all();
}
