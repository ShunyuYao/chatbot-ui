ALTER TABLE models ADD COLUMN provider_type TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE models ADD COLUMN thinking_budget_tokens INTEGER NOT NULL DEFAULT 0;
