CREATE TABLE IF NOT EXISTS labs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS models (
  id BIGSERIAL PRIMARY KEY,
  lab_id BIGINT NOT NULL REFERENCES labs(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  UNIQUE (lab_id, name)
);

DO $$
BEGIN
  CREATE TYPE incident_verdict AS ENUM ('excluded', 'included', 'resolution-pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE CHECK (link ~ '^https?://'),
  lab_id BIGINT NOT NULL REFERENCES labs(id) ON DELETE RESTRICT,
  model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  victim_count INTEGER NOT NULL DEFAULT 1 CHECK (victim_count > 0),
  minor_victim_count INTEGER NOT NULL DEFAULT 0
    CHECK (minor_victim_count >= 0 AND minor_victim_count <= victim_count),
  death_date TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  case_reference TEXT NOT NULL DEFAULT '',
  pathway TEXT CHECK (pathway IN ('direct-operation', 'enabled-harm', 'systemic-contribution')),
  transcript_status TEXT NOT NULL DEFAULT 'none'
    CHECK (transcript_status IN ('none', 'excerpts', 'partial', 'complete-final', 'sealed')),
  transcript_link TEXT CHECK (transcript_link IS NULL OR transcript_link ~ '^https?://'),
  source_links JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_links) = 'array'),
  claim_summary TEXT NOT NULL DEFAULT '',
  evidence_summary TEXT NOT NULL DEFAULT '',
  counterevidence TEXT NOT NULL DEFAULT '',
  -- Agent recommendation. Written by agents. Display only in the review UI.
  agent_verdict incident_verdict,
  agent_evidence_class TEXT CHECK (agent_evidence_class IN ('A', 'B', 'C', 'X')),
  agent_reasoning TEXT NOT NULL DEFAULT '',
  -- Human decision. Written only through the review UI. NULL until a human decides.
  human_verdict incident_verdict,
  human_reasoning TEXT NOT NULL DEFAULT '',
  human_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled incident',
  ADD COLUMN IF NOT EXISTS victim_count INTEGER NOT NULL DEFAULT 1 CHECK (victim_count > 0),
  ADD COLUMN IF NOT EXISTS minor_victim_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS death_date TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS case_reference TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pathway TEXT
    CHECK (pathway IN ('direct-operation', 'enabled-harm', 'systemic-contribution')),
  ADD COLUMN IF NOT EXISTS transcript_status TEXT NOT NULL DEFAULT 'none'
    CHECK (transcript_status IN ('none', 'excerpts', 'partial', 'complete-final', 'sealed')),
  ADD COLUMN IF NOT EXISTS transcript_link TEXT
    CHECK (transcript_link IS NULL OR transcript_link ~ '^https?://'),
  ADD COLUMN IF NOT EXISTS source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS claim_summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidence_summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS counterevidence TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS agent_verdict incident_verdict,
  ADD COLUMN IF NOT EXISTS agent_evidence_class TEXT
    CHECK (agent_evidence_class IN ('A', 'B', 'C', 'X')),
  ADD COLUMN IF NOT EXISTS agent_reasoning TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS human_verdict incident_verdict,
  ADD COLUMN IF NOT EXISTS human_reasoning TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS human_reviewed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_minor_victim_count_check'
  ) THEN
    ALTER TABLE incidents ADD CONSTRAINT incidents_minor_victim_count_check
      CHECK (minor_victim_count >= 0 AND minor_victim_count <= victim_count);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_source_links_check'
  ) THEN
    ALTER TABLE incidents ADD CONSTRAINT incidents_source_links_check
      CHECK (jsonb_typeof(source_links) = 'array');
  END IF;
END
$$;

-- Migration from the old single-track layout (review_state + verdict + evidence_class + reasoning).
-- Human-reviewed rows keep their decision in the human columns. Every other row keeps
-- its data as the agent recommendation, and the human columns stay empty.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'incidents' AND column_name = 'review_state'
  ) THEN
    EXECUTE $migrate$
      UPDATE incidents
      SET human_verdict = CASE WHEN review_state = 'human-reviewed' THEN verdict END,
          human_reasoning = CASE WHEN review_state = 'human-reviewed' THEN reasoning ELSE '' END,
          human_reviewed_at = CASE WHEN review_state = 'human-reviewed' THEN updated_at END,
          agent_verdict = CASE WHEN review_state = 'agent-recommended' THEN verdict END,
          agent_evidence_class = evidence_class,
          agent_reasoning = CASE WHEN review_state = 'human-reviewed' THEN '' ELSE reasoning END
      WHERE human_verdict IS NULL AND agent_verdict IS NULL
    $migrate$;
    EXECUTE 'ALTER TABLE incidents DROP COLUMN review_state, DROP COLUMN verdict, DROP COLUMN evidence_class, DROP COLUMN reasoning';
  END IF;
END
$$;

DROP TYPE IF EXISTS incident_review_state;

INSERT INTO labs (name, slug) VALUES
  ('OpenAI', 'openai'),
  ('Anthropic', 'anthropic'),
  ('Google DeepMind', 'google-deepmind'),
  ('xAI', 'xai'),
  ('Meta AI', 'meta-ai'),
  ('DeepSeek', 'deepseek'),
  ('Moonshot AI', 'moonshot-ai'),
  ('Alibaba Cloud', 'alibaba-cloud'),
  ('Mistral AI', 'mistral-ai'),
  ('Zhipu AI', 'zhipu-ai'),
  ('Character Technologies', 'character-technologies'),
  ('Chai Research', 'chai-research')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO models (lab_id, name, slug) VALUES
  ((SELECT id FROM labs WHERE slug = 'openai'), 'GPT-5.2', 'gpt-5-2'),
  ((SELECT id FROM labs WHERE slug = 'anthropic'), 'Claude Opus 4.6', 'claude-opus-4-6'),
  ((SELECT id FROM labs WHERE slug = 'google-deepmind'), 'Gemini 3.1 Pro', 'gemini-3-1-pro'),
  ((SELECT id FROM labs WHERE slug = 'deepseek'), 'DeepSeek V3.2', 'deepseek-v3-2'),
  ((SELECT id FROM labs WHERE slug = 'moonshot-ai'), 'Kimi K2.5', 'kimi-k2-5'),
  ((SELECT id FROM labs WHERE slug = 'openai'), 'GPT-4o', 'gpt-4o'),
  ((SELECT id FROM labs WHERE slug = 'openai'), 'ChatGPT (version unknown)', 'chatgpt-unknown'),
  ((SELECT id FROM labs WHERE slug = 'deepseek'), 'DeepSeek (version unknown)', 'deepseek-unknown'),
  ((SELECT id FROM labs WHERE slug = 'google-deepmind'), 'Gemini 2.5 Pro', 'gemini-2-5-pro'),
  ((SELECT id FROM labs WHERE slug = 'meta-ai'), 'Meta AI (version unknown)', 'meta-ai-unknown'),
  ((SELECT id FROM labs WHERE slug = 'character-technologies'), 'Character.AI (version unknown)', 'character-ai-unknown'),
  ((SELECT id FROM labs WHERE slug = 'chai-research'), 'Eliza (GPT-J based)', 'chai-eliza-gpt-j')
ON CONFLICT (slug) DO UPDATE SET
  lab_id = EXCLUDED.lab_id,
  name = EXCLUDED.name;
