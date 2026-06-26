-- Recruiting feature tables (teams table already exists from 0000)

CREATE TABLE IF NOT EXISTS "program_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"website_url" text,
	"has_scholarships" boolean,
	"min_gpa" text,
	"roster_needs" jsonb,
	"athletic_benchmarks" jsonb,
	"eligibility_notes" text,
	"majors_list" jsonb,
	"graduation_rate" text,
	"student_athlete_support_notes" text,
	"conference_standings" jsonb,
	"last_scraped_at" timestamp,
	"scraped_data_raw" jsonb,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "program_details_team_id_unique" UNIQUE("team_id")
);

CREATE TABLE IF NOT EXISTS "program_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"email" text,
	"phone" text,
	"scraped_at" timestamp DEFAULT now(),
	"scraped_from" text
);

CREATE TABLE IF NOT EXISTS "commitment_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"athlete_name" text NOT NULL,
	"position" text,
	"commitment_school" text NOT NULL,
	"commitment_division" text,
	"grad_year" integer,
	"story_text" text,
	"image_url" text,
	"tags" jsonb,
	"approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "profile_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"viewer_type" text NOT NULL,
	"viewer_name" text,
	"viewer_coach_id" integer,
	"viewed_at" timestamp DEFAULT now()
);

ALTER TABLE "program_details" ADD CONSTRAINT IF NOT EXISTS "program_details_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "program_staff" ADD CONSTRAINT IF NOT EXISTS "program_staff_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "commitment_stories" ADD CONSTRAINT IF NOT EXISTS "commitment_stories_athlete_id_players_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "profile_views" ADD CONSTRAINT IF NOT EXISTS "profile_views_athlete_id_players_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "profile_views" ADD CONSTRAINT IF NOT EXISTS "profile_views_viewer_coach_id_coaches_id_fk" FOREIGN KEY ("viewer_coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;
