CREATE TABLE IF NOT EXISTS "features" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "features_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_features" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"feature_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_features" ADD CONSTRAINT "role_features_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_features" ADD CONSTRAINT "role_features_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_features_role_feature_idx" ON "role_features" ("role_id","feature_id");
--> statement-breakpoint
INSERT INTO "roles" ("id", "key", "name", "description", "is_system")
VALUES
	('role_owner', 'owner', 'Owner', 'Full workspace access including billing and member management.', true),
	('role_admin', 'admin', 'Admin', 'Operational workspace access without billing ownership.', true),
	('role_member', 'member', 'Member', 'Contributor access for day-to-day board and job management.', true)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "features" ("id", "key", "name", "description")
VALUES
	('feature_board_create', 'board.create', 'Create boards', 'Create new job boards within a workspace.'),
	('feature_board_edit', 'board.edit', 'Edit boards', 'Edit board settings, content, and metadata.'),
	('feature_board_publish', 'board.publish', 'Publish boards', 'Publish or unpublish job boards.'),
	('feature_board_appearance', 'board.appearance.manage', 'Manage appearance', 'Change branding, theme, and board presentation.'),
	('feature_board_domain', 'board.domain.manage', 'Manage domains', 'Configure custom domains for a board.'),
	('feature_job_manage', 'job.manage', 'Manage jobs', 'Create, edit, and close job postings.'),
	('feature_application_review', 'application.review', 'Review applications', 'View and process job applications.'),
	('feature_workspace_members', 'workspace.members.manage', 'Manage members', 'Invite members and change workspace membership roles.'),
	('feature_workspace_billing', 'workspace.billing.manage', 'Manage billing', 'Manage plan, subscription, and billing settings.')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_features" ("id", "role_id", "feature_id")
VALUES
	('rf_owner_board_create', 'role_owner', 'feature_board_create'),
	('rf_owner_board_edit', 'role_owner', 'feature_board_edit'),
	('rf_owner_board_publish', 'role_owner', 'feature_board_publish'),
	('rf_owner_board_appearance', 'role_owner', 'feature_board_appearance'),
	('rf_owner_board_domain', 'role_owner', 'feature_board_domain'),
	('rf_owner_job_manage', 'role_owner', 'feature_job_manage'),
	('rf_owner_application_review', 'role_owner', 'feature_application_review'),
	('rf_owner_workspace_members', 'role_owner', 'feature_workspace_members'),
	('rf_owner_workspace_billing', 'role_owner', 'feature_workspace_billing'),
	('rf_admin_board_create', 'role_admin', 'feature_board_create'),
	('rf_admin_board_edit', 'role_admin', 'feature_board_edit'),
	('rf_admin_board_publish', 'role_admin', 'feature_board_publish'),
	('rf_admin_board_appearance', 'role_admin', 'feature_board_appearance'),
	('rf_admin_board_domain', 'role_admin', 'feature_board_domain'),
	('rf_admin_job_manage', 'role_admin', 'feature_job_manage'),
	('rf_admin_application_review', 'role_admin', 'feature_application_review'),
	('rf_admin_workspace_members', 'role_admin', 'feature_workspace_members'),
	('rf_member_board_edit', 'role_member', 'feature_board_edit'),
	('rf_member_board_appearance', 'role_member', 'feature_board_appearance'),
	('rf_member_job_manage', 'role_member', 'feature_job_manage'),
	('rf_member_application_review', 'role_member', 'feature_application_review')
ON CONFLICT ("role_id", "feature_id") DO NOTHING;