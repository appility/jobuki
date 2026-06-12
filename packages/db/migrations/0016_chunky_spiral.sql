CREATE TABLE IF NOT EXISTS "job_alert_log" (
	"id" text PRIMARY KEY NOT NULL,
	"alert_id" text NOT NULL,
	"user_id" text NOT NULL,
	"job_count" integer NOT NULL,
	"job_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resend_email_id" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"board_id" text,
	"search_term" text NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"remote_only" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_alert_log" ADD CONSTRAINT "job_alert_log_alert_id_job_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."job_alerts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_alert_log" ADD CONSTRAINT "job_alert_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_alert_log_alert_sent_idx" ON "job_alert_log" ("alert_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_alerts_user_enabled_idx" ON "job_alerts" ("user_id","enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_alerts_board_idx" ON "job_alerts" ("board_id");