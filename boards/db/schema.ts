import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortCode: text("short_code").notNull()
});

export const chapters = sqliteTable(
  "chapters",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id").notNull().references(() => subjects.id),
    number: integer("number").notNull(),
    name: text("name").notNull()
  },
  (table) => ({
    subjectNumberIdx: uniqueIndex("chapters_subject_number_idx").on(table.subjectId, table.number)
  })
);

export const topics = sqliteTable(
  "topics",
  {
    id: text("id").primaryKey(),
    chapterId: text("chapter_id").notNull().references(() => chapters.id),
    name: text("name").notNull(),
    slug: text("slug").notNull()
  },
  (table) => ({
    chapterSlugIdx: uniqueIndex("topics_chapter_slug_idx").on(table.chapterId, table.slug)
  })
);

export const papers = sqliteTable(
  "papers",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id").notNull().references(() => subjects.id),
    year: integer("year").notNull(),
    setName: text("set_name").notNull(),
    paperType: text("paper_type").notNull(),
    sourceUrl: text("source_url").notNull(),
    filePath: text("file_path"),
    language: text("language").notNull().default("english"),
    trustLevel: text("trust_level").notNull().default("official"),
    verifiedAt: integer("verified_at", { mode: "timestamp" })
  },
  (table) => ({
    subjectYearIdx: index("papers_subject_year_idx").on(table.subjectId, table.year)
  })
);

export const questionClusters = sqliteTable("question_clusters", {
  id: text("id").primaryKey(),
  canonicalText: text("canonical_text").notNull(),
  normalizedText: text("normalized_text").notNull(),
  repeatCount: integer("repeat_count").notNull().default(1),
  firstYear: integer("first_year"),
  lastYear: integer("last_year"),
  similarityMethod: text("similarity_method").notNull().default("exact"),
  confidence: real("confidence").notNull().default(1)
});

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id").notNull().references(() => subjects.id),
    chapterId: text("chapter_id").notNull().references(() => chapters.id),
    topicId: text("topic_id").references(() => topics.id),
    clusterId: text("cluster_id").references(() => questionClusters.id),
    canonicalText: text("canonical_text").notNull(),
    markdown: text("markdown").notNull(),
    questionType: text("question_type").notNull(),
    marks: integer("marks").notNull(),
    difficulty: text("difficulty").notNull().default("medium"),
    extractionConfidence: real("extraction_confidence").notNull().default(1),
    needsReview: integer("needs_review", { mode: "boolean" }).notNull().default(false),
    rawText: text("raw_text"),
    status: text("status").notNull().default("active"),
    dupeGroup: text("dupe_group"),
    nearDupeCandidate: integer("near_dupe_candidate", { mode: "boolean" }).notNull().default(false),
    crossSourceDupe: integer("cross_source_dupe", { mode: "boolean" }).notNull().default(false),
    options: text("options"),
    correctOption: text("correct_option"),
    questionData: text("question_data"),
    tableData: text("table_data"),
    renderHint: text("render_hint"),
    hasImage: integer("has_image", { mode: "boolean" }).notNull().default(false),
    imagePath: text("image_path"),
    imageAltText: text("image_alt_text"),
    ocrText: text("ocr_text"),
    ocrSource: integer("ocr_source", { mode: "boolean" }).notNull().default(false),
    parentQuestionId: text("parent_question_id"),
    answerKey: text("answer_key"),
    blankCount: integer("blank_count"),
    questionSubtype: text("question_subtype"),
    sourceQNumber: text("source_q_number"),
    section: text("section"),
    orPairId: text("or_pair_id"),
    orPosition: text("or_position"),
    canonicalQuestionId: text("canonical_question_id"),
    paperSetCode: text("paper_set_code"),
    paperPart: text("paper_part"),
    isOptionalBranch: integer("is_optional_branch", { mode: "boolean" }).notNull().default(false),
    branchGroup: text("branch_group"),
    cbqStimulus: text("cbq_stimulus"),
    wordLimit: integer("word_limit"),
    internalChoiceMeta: text("internal_choice_meta"),
    viReplacesQNumber: text("vi_replaces_q_number"),
    viReplacesId: text("vi_replaces_id"),
    isViAlternative: integer("is_vi_alternative", { mode: "boolean" }).notNull().default(false),
    requiresCalculation: integer("requires_calculation", { mode: "boolean" }).notNull().default(false),
    givenData: text("given_data"),
    cognitiveLevel: text("cognitive_level"),
    textSource: text("text_source"),
    textType: text("text_type"),
    textbook: text("textbook"),
    marksSource: text("marks_source"),
    marksDisplayPosition: text("marks_display_position").notNull().default("right"),
    marksVerified: integer("marks_verified", { mode: "boolean" }).notNull().default(false),
    hadPageSplit: integer("had_page_split", { mode: "boolean" }).notNull().default(false),
    mergedIntoId: text("merged_into_id"),
    splitScore: integer("split_score"),
    classificationSource: text("classification_source"),
    tagMetadata: text("tag_metadata"),
    scenarioContext: text("scenario_context"),
    questionStem: text("question_stem"),
    subjectCode: text("subject_code"),
    markingCriteria: text("marking_criteria"),
    wordLimitNote: text("word_limit_note"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`)
  },
  (table) => ({
    subjectChapterIdx: index("questions_subject_chapter_idx").on(table.subjectId, table.chapterId),
    clusterIdx: index("questions_cluster_idx").on(table.clusterId)
  })
);

export const questionOccurrences = sqliteTable(
  "question_occurrences",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id").notNull().references(() => questions.id),
    paperId: text("paper_id").notNull().references(() => papers.id),
    year: integer("year").notNull(),
    questionNumber: text("question_number").notNull(),
    originalText: text("original_text").notNull(),
    wordingDelta: text("wording_delta"),
    marks: integer("marks").notNull()
  },
  (table) => ({
    questionYearIdx: index("occurrences_question_year_idx").on(table.questionId, table.year)
  })
);

export const solutions = sqliteTable(
  "solutions",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id").notNull().references(() => questions.id),
    source: text("source").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    sourceUrl: text("source_url"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`)
  },
  (table) => ({
    questionSourceIdx: index("solutions_question_source_idx").on(table.questionId, table.source)
  })
);

export const practiceAttempts = sqliteTable("practice_attempts", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(),
  subjectId: text("subject_id").references(() => subjects.id),
  chapterId: text("chapter_id").references(() => chapters.id),
  topicId: text("topic_id").references(() => topics.id),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  totalQuestions: integer("total_questions").notNull(),
  correctCount: integer("correct_count").notNull().default(0),
  wrongCount: integer("wrong_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  totalSeconds: integer("total_seconds").notNull().default(0)
});

export const practiceResponses = sqliteTable("practice_responses", {
  id: text("id").primaryKey(),
  attemptId: text("attempt_id").notNull().references(() => practiceAttempts.id),
  questionId: text("question_id").notNull().references(() => questions.id),
  selectedOption: text("selected_option"),
  correctOption: text("correct_option"),
  status: text("status").notNull(),
  secondsSpent: integer("seconds_spent").notNull()
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`)
});
