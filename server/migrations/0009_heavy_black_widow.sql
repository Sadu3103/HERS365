CREATE TABLE "push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"coach_id" integer,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_players_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;