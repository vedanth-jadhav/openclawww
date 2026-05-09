ALTER TABLE questions ADD COLUMN raw_text TEXT;
ALTER TABLE questions ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE questions ADD COLUMN dupe_group TEXT;
ALTER TABLE questions ADD COLUMN near_dupe_candidate INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN cross_source_dupe INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN options TEXT;
ALTER TABLE questions ADD COLUMN correct_option TEXT;
ALTER TABLE questions ADD COLUMN question_data TEXT;
ALTER TABLE questions ADD COLUMN table_data TEXT;
ALTER TABLE questions ADD COLUMN render_hint TEXT;
ALTER TABLE questions ADD COLUMN has_image INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN image_path TEXT;
ALTER TABLE questions ADD COLUMN image_alt_text TEXT;
ALTER TABLE questions ADD COLUMN ocr_text TEXT;
ALTER TABLE questions ADD COLUMN ocr_source INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN parent_question_id TEXT REFERENCES questions(id);
ALTER TABLE questions ADD COLUMN answer_key TEXT;
ALTER TABLE questions ADD COLUMN blank_count INTEGER;
ALTER TABLE questions ADD COLUMN question_subtype TEXT;
ALTER TABLE questions ADD COLUMN source_q_number TEXT;
ALTER TABLE questions ADD COLUMN section TEXT;
ALTER TABLE questions ADD COLUMN or_pair_id TEXT;
ALTER TABLE questions ADD COLUMN or_position TEXT;
ALTER TABLE questions ADD COLUMN canonical_question_id TEXT REFERENCES questions(id);
ALTER TABLE questions ADD COLUMN paper_set_code TEXT;
ALTER TABLE questions ADD COLUMN paper_part TEXT;
ALTER TABLE questions ADD COLUMN is_optional_branch INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN branch_group TEXT;
ALTER TABLE questions ADD COLUMN cbq_stimulus TEXT;
ALTER TABLE questions ADD COLUMN word_limit INTEGER;
ALTER TABLE questions ADD COLUMN internal_choice_meta TEXT;
ALTER TABLE questions ADD COLUMN vi_replaces_q_number TEXT;
ALTER TABLE questions ADD COLUMN vi_replaces_id TEXT REFERENCES questions(id);
ALTER TABLE questions ADD COLUMN is_vi_alternative INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN requires_calculation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN given_data TEXT;
ALTER TABLE questions ADD COLUMN cognitive_level TEXT;
ALTER TABLE questions ADD COLUMN text_source TEXT;
ALTER TABLE questions ADD COLUMN text_type TEXT;
ALTER TABLE questions ADD COLUMN textbook TEXT;
ALTER TABLE questions ADD COLUMN marks_source TEXT;
ALTER TABLE questions ADD COLUMN marks_display_position TEXT NOT NULL DEFAULT 'right';
ALTER TABLE questions ADD COLUMN marks_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN had_page_split INTEGER NOT NULL DEFAULT 0;
ALTER TABLE questions ADD COLUMN merged_into_id TEXT REFERENCES questions(id);
ALTER TABLE questions ADD COLUMN split_score INTEGER;
ALTER TABLE questions ADD COLUMN classification_source TEXT;
ALTER TABLE questions ADD COLUMN tag_metadata TEXT;
ALTER TABLE questions ADD COLUMN scenario_context TEXT;
ALTER TABLE questions ADD COLUMN question_stem TEXT;
ALTER TABLE questions ADD COLUMN subject_code TEXT;
ALTER TABLE questions ADD COLUMN marking_criteria TEXT;
ALTER TABLE questions ADD COLUMN word_limit_note TEXT;

CREATE TRIGGER IF NOT EXISTS questions_or_position_check_insert
BEFORE INSERT ON questions
WHEN NEW.or_position IS NOT NULL AND NEW.or_position NOT IN ('A', 'B')
BEGIN
  SELECT RAISE(ABORT, 'invalid or_position');
END;

CREATE TRIGGER IF NOT EXISTS questions_or_position_check_update
BEFORE UPDATE OF or_position ON questions
WHEN NEW.or_position IS NOT NULL AND NEW.or_position NOT IN ('A', 'B')
BEGIN
  SELECT RAISE(ABORT, 'invalid or_position');
END;
