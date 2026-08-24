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

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link TEXT NOT NULL UNIQUE CHECK (link ~ '^https?://'),
  lab_id BIGINT NOT NULL REFERENCES labs(id) ON DELETE RESTRICT,
  model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  ('Zhipu AI', 'zhipu-ai')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO models (lab_id, name, slug) VALUES
  ((SELECT id FROM labs WHERE slug = 'openai'), 'GPT-5.2', 'gpt-5-2'),
  ((SELECT id FROM labs WHERE slug = 'anthropic'), 'Claude Opus 4.6', 'claude-opus-4-6'),
  ((SELECT id FROM labs WHERE slug = 'google-deepmind'), 'Gemini 3.1 Pro', 'gemini-3-1-pro'),
  ((SELECT id FROM labs WHERE slug = 'deepseek'), 'DeepSeek V3.2', 'deepseek-v3-2'),
  ((SELECT id FROM labs WHERE slug = 'moonshot-ai'), 'Kimi K2.5', 'kimi-k2-5')
ON CONFLICT (slug) DO UPDATE SET
  lab_id = EXCLUDED.lab_id,
  name = EXCLUDED.name;
