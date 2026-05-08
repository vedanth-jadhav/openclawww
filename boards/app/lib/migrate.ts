import { sqlite } from "@/app/lib/db";

export function ensureDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id),
      number INTEGER NOT NULL,
      name TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS chapters_subject_number_idx ON chapters(subject_id, number);
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS topics_chapter_slug_idx ON topics(chapter_id, slug);
    CREATE TABLE IF NOT EXISTS papers (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id),
      year INTEGER NOT NULL,
      set_name TEXT NOT NULL,
      paper_type TEXT NOT NULL,
      source_url TEXT NOT NULL,
      file_path TEXT,
      language TEXT NOT NULL DEFAULT 'english',
      trust_level TEXT NOT NULL DEFAULT 'official',
      verified_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS papers_subject_year_idx ON papers(subject_id, year);
    CREATE TABLE IF NOT EXISTS question_clusters (
      id TEXT PRIMARY KEY,
      canonical_text TEXT NOT NULL,
      normalized_text TEXT NOT NULL,
      repeat_count INTEGER NOT NULL DEFAULT 1,
      first_year INTEGER,
      last_year INTEGER,
      similarity_method TEXT NOT NULL DEFAULT 'exact',
      confidence REAL NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id),
      chapter_id TEXT NOT NULL REFERENCES chapters(id),
      topic_id TEXT REFERENCES topics(id),
      cluster_id TEXT REFERENCES question_clusters(id),
      canonical_text TEXT NOT NULL,
      markdown TEXT NOT NULL,
      question_type TEXT NOT NULL,
      marks INTEGER NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      extraction_confidence REAL NOT NULL DEFAULT 1,
      needs_review INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS questions_subject_chapter_idx ON questions(subject_id, chapter_id);
    CREATE INDEX IF NOT EXISTS questions_cluster_idx ON questions(cluster_id);
    CREATE TABLE IF NOT EXISTS question_occurrences (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id),
      paper_id TEXT NOT NULL REFERENCES papers(id),
      year INTEGER NOT NULL,
      question_number TEXT NOT NULL,
      original_text TEXT NOT NULL,
      wording_delta TEXT,
      marks INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS occurrences_question_year_idx ON question_occurrences(question_id, year);
    CREATE TABLE IF NOT EXISTS solutions (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id),
      source TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      source_url TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS solutions_question_source_idx ON solutions(question_id, source);
    CREATE TABLE IF NOT EXISTS practice_attempts (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      subject_id TEXT REFERENCES subjects(id),
      chapter_id TEXT REFERENCES chapters(id),
      topic_id TEXT REFERENCES topics(id),
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      total_questions INTEGER NOT NULL,
      correct_count INTEGER NOT NULL DEFAULT 0,
      wrong_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      total_seconds INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS practice_responses (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES practice_attempts(id),
      question_id TEXT NOT NULL REFERENCES questions(id),
      selected_option TEXT,
      correct_option TEXT,
      status TEXT NOT NULL,
      seconds_spent INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
      question_id UNINDEXED,
      canonical_text,
      markdown,
      topic,
      chapter,
      subject,
      solution
    );
  `);

  const existingColumns = new Set(
    sqlite.prepare("PRAGMA table_info(questions)").all().map((column) => (column as { name: string }).name)
  );
  const columns: Array<[string, string]> = [
    ["raw_text", "TEXT"],
    ["status", "TEXT NOT NULL DEFAULT 'active'"],
    ["dupe_group", "TEXT"],
    ["near_dupe_candidate", "INTEGER NOT NULL DEFAULT 0"],
    ["cross_source_dupe", "INTEGER NOT NULL DEFAULT 0"],
    ["options", "TEXT"],
    ["correct_option", "TEXT"],
    ["question_data", "TEXT"],
    ["table_data", "TEXT"],
    ["render_hint", "TEXT"],
    ["has_image", "INTEGER NOT NULL DEFAULT 0"],
    ["image_path", "TEXT"],
    ["image_alt_text", "TEXT"],
    ["ocr_text", "TEXT"],
    ["ocr_source", "INTEGER NOT NULL DEFAULT 0"],
    ["parent_question_id", "TEXT REFERENCES questions(id)"],
    ["answer_key", "TEXT"],
    ["blank_count", "INTEGER"],
    ["question_subtype", "TEXT"],
    ["source_q_number", "TEXT"],
    ["section", "TEXT"],
    ["or_pair_id", "TEXT"],
    ["or_position", "TEXT"],
    ["canonical_question_id", "TEXT REFERENCES questions(id)"],
    ["paper_set_code", "TEXT"],
    ["paper_part", "TEXT"],
    ["is_optional_branch", "INTEGER NOT NULL DEFAULT 0"],
    ["branch_group", "TEXT"],
    ["cbq_stimulus", "TEXT"],
    ["word_limit", "INTEGER"],
    ["internal_choice_meta", "TEXT"],
    ["vi_replaces_q_number", "TEXT"],
    ["vi_replaces_id", "TEXT REFERENCES questions(id)"],
    ["is_vi_alternative", "INTEGER NOT NULL DEFAULT 0"],
    ["requires_calculation", "INTEGER NOT NULL DEFAULT 0"],
    ["given_data", "TEXT"],
    ["cognitive_level", "TEXT"],
    ["text_source", "TEXT"],
    ["text_type", "TEXT"],
    ["textbook", "TEXT"],
    ["marks_source", "TEXT"],
    ["marks_display_position", "TEXT NOT NULL DEFAULT 'right'"],
    ["marks_verified", "INTEGER NOT NULL DEFAULT 0"],
    ["had_page_split", "INTEGER NOT NULL DEFAULT 0"],
    ["merged_into_id", "TEXT REFERENCES questions(id)"],
    ["split_score", "INTEGER"],
    ["classification_source", "TEXT"],
    ["tag_metadata", "TEXT"],
    ["scenario_context", "TEXT"],
    ["question_stem", "TEXT"],
    ["subject_code", "TEXT"],
    ["marking_criteria", "TEXT"],
    ["word_limit_note", "TEXT"]
  ];

  for (const [name, definition] of columns) {
    if (!existingColumns.has(name)) {
      sqlite.exec(`ALTER TABLE questions ADD COLUMN ${name} ${definition}`);
    }
  }
}
