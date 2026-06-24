CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state" text,
	"city" text,
	"format" text,
	"age_groups" text,
	"season" text,
	"website" text,
	"registration_open" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
