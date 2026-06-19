ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "profile_image" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "preferences" jsonb DEFAULT '{}'::jsonb;
