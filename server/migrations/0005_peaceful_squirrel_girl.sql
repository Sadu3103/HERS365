ALTER TABLE "athlete_rankings" ALTER COLUMN "data_sources" SET DATA TYPE json USING data_sources::json;--> statement-breakpoint
ALTER TABLE "athlete_rankings" ALTER COLUMN "updated_at" SET DATA TYPE timestamp USING updated_at::timestamp;--> statement-breakpoint
ALTER TABLE "athlete_rankings" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "date" SET DATA TYPE timestamp USING date::timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "due_date" SET DATA TYPE timestamp USING due_date::timestamp;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "player_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp USING updated_at::timestamp;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "paid_at" SET DATA TYPE timestamp USING paid_at::timestamp;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ALTER COLUMN "player_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ALTER COLUMN "plan_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ADD COLUMN "updated_at" timestamp DEFAULT now();
