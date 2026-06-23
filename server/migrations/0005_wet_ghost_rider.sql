CREATE TABLE "athlete_program_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"percent_complete" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_program_progress_player_program_unq" UNIQUE("player_id","program_id")
);
--> statement-breakpoint
CREATE TABLE "athlete_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"program_id" integer,
	"activity" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"intensity" text,
	"notes" text,
	"session_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "athlete_program_progress" ADD CONSTRAINT "athlete_program_progress_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_sessions" ADD CONSTRAINT "athlete_sessions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;