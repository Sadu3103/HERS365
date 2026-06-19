ALTER TABLE "coaches" ADD COLUMN "verification_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "verification_note" text;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "dob" timestamp;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "pending_parent_email" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb;