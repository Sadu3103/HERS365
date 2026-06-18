CREATE TABLE "account_lockouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_type" text NOT NULL,
	"email" text NOT NULL,
	"lockout_reason" text NOT NULL,
	"locked_at" timestamp DEFAULT now(),
	"unlock_at" timestamp,
	"is_permanent" boolean DEFAULT false,
	"unlocked_by" text,
	"unlocked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text
);
--> statement-breakpoint
CREATE TABLE "ai_bots" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"bot_name" text,
	"personality" text,
	"interaction_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "athlete_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"national_rank" integer,
	"state_rank" integer,
	"position_rank" integer,
	"percentile" integer,
	"movement" text,
	"overall_score" double precision,
	"combine_score" double precision,
	"max_preps_score" double precision,
	"zybek_score" double precision,
	"usa_talent_id_score" double precision,
	"data_sources" text,
	"max_preps_last_update" text,
	"zybek_last_update" text,
	"usa_talent_id_last_update" text,
	"combine_last_update" text,
	"max_preps_verified" boolean DEFAULT false,
	"zybek_verified" boolean DEFAULT false,
	"usa_talent_id_verified" boolean DEFAULT false,
	"combine_verified" boolean DEFAULT false,
	"updated_at" text DEFAULT now(),
	CONSTRAINT "athlete_rankings_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"category" text
);
--> statement-breakpoint
CREATE TABLE "bot_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" integer,
	"role" text,
	"content" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brand_partnerships" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"opportunity_id" integer,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"points" integer,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "coach_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer,
	"player_id" integer,
	"skill_ratings" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "coach_prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer,
	"athlete_id" integer,
	"tier" text DEFAULT 'watching',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text,
	"university" text,
	"division" text,
	"recruiting_positions" text,
	"recruiting_states" text,
	"verified_status" boolean DEFAULT false,
	CONSTRAINT "coaches_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "combine_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"season" text,
	"forty_dash" text,
	"shuttle" text,
	"vertical" text,
	"broad_jump" text,
	"three_cone" text
);
--> statement-breakpoint
CREATE TABLE "command_store" (
	"id" text PRIMARY KEY NOT NULL,
	"command_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"payload" text NOT NULL,
	"metadata" text NOT NULL,
	"executed" boolean DEFAULT false,
	"executed_at" text,
	"result" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"created_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"player_id" integer,
	"content" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deal_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"opportunity_id" integer,
	"status" text,
	"ai_match_score" integer
);
--> statement-breakpoint
CREATE TABLE "deal_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer,
	"task_description" text,
	"completed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "device_trust_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_type" text NOT NULL,
	"device_fingerprint" text NOT NULL,
	"trust_score" integer DEFAULT 50,
	"factors" text,
	"last_login_at" timestamp,
	"consecutive_failures" integer DEFAULT 0,
	"requires_mfa" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "distributed_locks" (
	"id" text PRIMARY KEY NOT NULL,
	"lock_key" text NOT NULL,
	"owner_id" text NOT NULL,
	"ttl" integer NOT NULL,
	"acquired_at" text DEFAULT now(),
	"metadata" text,
	CONSTRAINT "distributed_locks_lock_key_unique" UNIQUE("lock_key")
);
--> statement-breakpoint
CREATE TABLE "drills" (
	"id" serial PRIMARY KEY NOT NULL,
	"position" text,
	"category" text,
	"instructions" text
);
--> statement-breakpoint
CREATE TABLE "earnings_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"application_id" integer,
	"amount" integer,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "event_inbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" text NOT NULL,
	"metadata" text NOT NULL,
	"processed" boolean DEFAULT false,
	"processed_at" text,
	"processing_id" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"error_message" text,
	"created_at" text DEFAULT now(),
	CONSTRAINT "event_inbox_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "event_leaderboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer,
	"player_id" integer,
	"rank" integer,
	"performance_metrics" text
);
--> statement-breakpoint
CREATE TABLE "event_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" text NOT NULL,
	"metadata" text NOT NULL,
	"published" boolean DEFAULT false,
	"published_at" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 5,
	"error_message" text,
	"next_retry_at" text,
	"created_at" text DEFAULT now(),
	CONSTRAINT "event_outbox_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer,
	"player_id" integer,
	"checked_in" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "event_store" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"timestamp" text NOT NULL,
	"correlation_id" text NOT NULL,
	"causation_id" text,
	"user_id" text,
	"user_type" text,
	"source" text NOT NULL,
	"version" integer NOT NULL,
	"metadata" text NOT NULL,
	"payload" text NOT NULL,
	"processed" boolean DEFAULT false,
	"processed_at" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"dead_letter" boolean DEFAULT false,
	"dead_letter_reason" text,
	"created_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"location" text NOT NULL,
	"registration_deadline" text,
	"participant_count" integer DEFAULT 0,
	"capacity" integer DEFAULT 0,
	"price" integer DEFAULT 0,
	"description" text,
	"upcoming" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "failed_login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"user_type" text NOT NULL,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"attempted_at" timestamp DEFAULT now(),
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" text DEFAULT 'General',
	"is_public" boolean DEFAULT true,
	"asked_count" integer DEFAULT 1,
	"last_asked_at" text DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" integer,
	"following_id" integer
);
--> statement-breakpoint
CREATE TABLE "game_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"game_id" integer,
	"passing_attempts" integer,
	"passing_completions" integer,
	"passing_yards" integer,
	"passing_tds" integer,
	"interceptions_thrown" integer,
	"longest_pass" integer,
	"rushing_attempts" integer,
	"rushing_yards" integer,
	"rushing_tds" integer,
	"longest_run" integer,
	"receptions" integer,
	"receiving_yards" integer,
	"receiving_tds" integer,
	"longest_reception" integer,
	"flag_pulls" integer,
	"interceptions_caught" integer,
	"pass_breakups" integer,
	"defensive_tds" integer
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_data" text,
	"status" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT now(),
	"completed_at" text,
	CONSTRAINT "idempotency_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"invoice_number" text NOT NULL,
	"amount" integer NOT NULL,
	"tax" integer DEFAULT 0,
	"total" integer NOT NULL,
	"status" text DEFAULT 'draft',
	"due_date" text,
	"paid_at" text,
	"description" text,
	"line_items" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentorship_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"mentor_name" text,
	"matched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"blocker_id" integer NOT NULL,
	"blocker_role" text NOT NULL,
	"blocked_id" integer NOT NULL,
	"blocked_role" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer NOT NULL,
	"reporter_role" text NOT NULL,
	"reported_id" integer NOT NULL,
	"reported_role" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"receiver_id" integer,
	"content" text NOT NULL,
	"status" text DEFAULT 'pending',
	"parent_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer,
	"athlete_id" integer,
	"sender_id" integer,
	"sender_type" text,
	"content" text NOT NULL,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mfa_secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_type" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nil_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"activity_type" text,
	"points_earned" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nil_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_name" text,
	"requirements" text,
	"deliverables" text,
	"estimated_earnings" integer
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"type" text,
	"actor_name" text,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parent_child_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"player_id" integer,
	"relationship" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "parents_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"type" text NOT NULL,
	"last4" text,
	"brand" text,
	"expiry_month" integer,
	"expiry_year" integer,
	"stripe_payment_method_id" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd',
	"status" text DEFAULT 'pending',
	"payment_method" text,
	"payment_type" text,
	"description" text,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"receipt_url" text,
	"parent_name" text,
	"parent_email" text,
	"parent_phone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" text DEFAULT now(),
	"paid_at" text
);
--> statement-breakpoint
CREATE TABLE "player_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"badge_id" integer,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"challenge_id" integer,
	"progress" integer DEFAULT 0,
	"completed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "player_highlights" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"video_url" text,
	"thumbnail_url" text,
	"category" text,
	"season" text,
	"annotations" jsonb DEFAULT '[]'::jsonb,
	"clip_settings" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"plan_id" integer,
	"status" text,
	"stripe_subscription_id" text
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"bio" text,
	"position" text,
	"age" integer,
	"state" text,
	"city" text,
	"zip_code" text,
	"school" text,
	"grad_year" integer,
	"g5_rating" integer,
	"nil_points" integer DEFAULT 0,
	"xp_points" integer DEFAULT 0,
	"level" integer DEFAULT 1,
	"archetype" text,
	"gpa" text,
	"sport" text,
	"achievements" text,
	"college_offers" jsonb,
	"verification_status" text DEFAULT 'unverified',
	"subscription_tier" text DEFAULT 'free',
	"privacy_setting" text DEFAULT 'public',
	"segment" text DEFAULT 'high_school',
	"skill_tier" text DEFAULT 'beginner',
	"is_recreational" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "players_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"content" text,
	"media_url" text,
	"media_type" text,
	"category" text,
	"moderation_status" text DEFAULT 'pending',
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "program_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"position" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_type" text NOT NULL,
	"token_hash" text NOT NULL,
	"device_fingerprint" text,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "saga_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"saga_type" text NOT NULL,
	"correlation_id" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"status" text NOT NULL,
	"current_step" text,
	"steps_completed" text NOT NULL,
	"compensating" boolean DEFAULT false,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"error_message" text,
	"metadata" text,
	"created_at" text DEFAULT now(),
	"updated_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_scholarships" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"scholarship_id" integer,
	"saved_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"opponent_name" text,
	"date" text,
	"result" text
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"deadline" text NOT NULL,
	"requirements" text,
	"category" text,
	"eligible_states" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_type" text,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"location" text,
	"metadata" text,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_type" text,
	"action" text NOT NULL,
	"resource" text,
	"ip_address" text,
	"user_agent" text,
	"location" text,
	"success" boolean DEFAULT true,
	"error_message" text,
	"metadata" text,
	"compliance_flags" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_health" (
	"id" text PRIMARY KEY NOT NULL,
	"service_name" text NOT NULL,
	"service_id" text NOT NULL,
	"status" text NOT NULL,
	"last_health_check" text DEFAULT now(),
	"consecutive_failures" integer DEFAULT 0,
	"total_requests" integer DEFAULT 0,
	"failed_requests" integer DEFAULT 0,
	"average_response_time" double precision,
	"circuit_breaker_state" text DEFAULT 'closed',
	"last_failure_at" text,
	"metadata" text,
	"created_at" text DEFAULT now(),
	"updated_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"service_name" text NOT NULL,
	"service_id" text NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"protocol" text DEFAULT 'http',
	"health_endpoint" text DEFAULT '/health',
	"status" text DEFAULT 'starting',
	"last_heartbeat" text DEFAULT now(),
	"metadata" text,
	"tags" text,
	"registered_at" text DEFAULT now(),
	"updated_at" text DEFAULT now(),
	CONSTRAINT "service_registry_service_id_unique" UNIQUE("service_id")
);
--> statement-breakpoint
CREATE TABLE "skill_challenge_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"drill_id" integer,
	"ai_feedback" text,
	"score" integer
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"image_url" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"price" integer,
	"tier_level" text
);
--> statement-breakpoint
CREATE TABLE "support_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"question" text NOT NULL,
	"ai_response" text NOT NULL,
	"was_helpful" boolean DEFAULT true,
	"tags" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_nil_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"campaign_name" text,
	"total_pool" integer
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"state" text,
	"city" text,
	"conference" text,
	"division" text,
	"wins" integer DEFAULT 0,
	"losses" integer DEFAULT 0,
	"titles" integer DEFAULT 0,
	"rating" integer DEFAULT 0,
	"tuition_in_state" integer,
	"tuition_out_state" integer,
	"has_application" boolean DEFAULT false,
	"has_questionnaire" boolean DEFAULT false,
	"application_url" text,
	"questionnaire_url" text,
	"socials" jsonb,
	"type" text DEFAULT 'college'
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"weekly_schedule" text,
	"goals" text
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_type" text NOT NULL,
	"session_id" text NOT NULL,
	"refresh_token_id" integer,
	"device_fingerprint" text,
	"ip_address" text,
	"user_agent" text,
	"location" text,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp NOT NULL,
	"last_activity_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "ai_bots" ADD CONSTRAINT "ai_bots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_rankings" ADD CONSTRAINT "athlete_rankings_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_bot_id_ai_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."ai_bots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_partnerships" ADD CONSTRAINT "brand_partnerships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_partnerships" ADD CONSTRAINT "brand_partnerships_opportunity_id_nil_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."nil_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_feedback" ADD CONSTRAINT "coach_feedback_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_feedback" ADD CONSTRAINT "coach_feedback_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_prospects" ADD CONSTRAINT "coach_prospects_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_prospects" ADD CONSTRAINT "coach_prospects_athlete_id_players_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combine_stats" ADD CONSTRAINT "combine_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_applications" ADD CONSTRAINT "deal_applications_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_applications" ADD CONSTRAINT "deal_applications_opportunity_id_nil_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."nil_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_tasks" ADD CONSTRAINT "deal_tasks_application_id_deal_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."deal_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_tracking" ADD CONSTRAINT "earnings_tracking_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_tracking" ADD CONSTRAINT "earnings_tracking_application_id_deal_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."deal_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_leaderboards" ADD CONSTRAINT "event_leaderboards_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_leaderboards" ADD CONSTRAINT "event_leaderboards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_players_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_players_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_stats" ADD CONSTRAINT "game_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_connections" ADD CONSTRAINT "mentorship_connections_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_requests" ADD CONSTRAINT "message_requests_athlete_id_players_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_requests" ADD CONSTRAINT "message_requests_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_athlete_id_players_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nil_activities" ADD CONSTRAINT "nil_activities_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_child_relations" ADD CONSTRAINT "parent_child_relations_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_child_relations" ADD CONSTRAINT "parent_child_relations_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_badges" ADD CONSTRAINT "player_badges_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_badges" ADD CONSTRAINT "player_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_challenges" ADD CONSTRAINT "player_challenges_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_challenges" ADD CONSTRAINT "player_challenges_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_highlights" ADD CONSTRAINT "player_highlights_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ADD CONSTRAINT "player_subscriptions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_subscriptions" ADD CONSTRAINT "player_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_applications" ADD CONSTRAINT "program_applications_athlete_id_players_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_scholarships" ADD CONSTRAINT "saved_scholarships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_scholarships" ADD CONSTRAINT "saved_scholarships_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_schools" ADD CONSTRAINT "saved_schools_athlete_id_players_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_challenge_completions" ADD CONSTRAINT "skill_challenge_completions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_challenge_completions" ADD CONSTRAINT "skill_challenge_completions_drill_id_drills_id_fk" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_interactions" ADD CONSTRAINT "support_interactions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_nil_campaigns" ADD CONSTRAINT "team_nil_campaigns_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_refresh_token_id_refresh_tokens_id_fk" FOREIGN KEY ("refresh_token_id") REFERENCES "public"."refresh_tokens"("id") ON DELETE no action ON UPDATE no action;