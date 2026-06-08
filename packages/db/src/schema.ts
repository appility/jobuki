import {
  pgTable, text, timestamp, jsonb, integer, pgEnum, uniqueIndex, boolean, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import type { BoardTheme, JobBoardThemeConfig } from '@jobuki/types'

// ── Enums ────────────────────────────────────────────────────────────
export const memberRoleEnum      = pgEnum('member_role',       ['owner', 'admin', 'member'])
export const boardStatusEnum     = pgEnum('board_status',      ['draft', 'live', 'suspended'])
export const jobStatusEnum       = pgEnum('job_status',        ['draft', 'published', 'closed'])
export const remotePolicyEnum    = pgEnum('remote_policy',     ['remote', 'hybrid', 'onsite'])
export const employmentTypeEnum  = pgEnum('employment_type',   ['full-time', 'part-time', 'contract', 'freelance', 'internship'])
export const applicationStatusEnum = pgEnum('application_status', ['new', 'reviewing', 'shortlisted', 'rejected', 'hired'])
export const planEnum            = pgEnum('plan',              ['free', 'growth', 'scale'])
export const accountTypeEnum     = pgEnum('account_type',      ['board_creator', 'job_seeker', 'job_poster'])

// ── Users ────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  accountType: accountTypeEnum('account_type').notNull().default('board_creator'),
  email:       text('email').notNull(),
  name:        text('name'),
  imageUrl:    text('image_url'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

// ── Workspaces ───────────────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id:                   text('id').primaryKey().$defaultFn(() => createId()),
  name:                 text('name').notNull(),
  slug:                 text('slug').notNull().unique(),
  clerkOrgId:           text('clerk_org_id').unique(),
  ownerUserId:          text('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  plan:                 planEnum('plan').notNull().default('free'),
  subscriptionStatus:   text('subscription_status').notNull().default('inactive'),
  stripeCustomerId:     text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})

// ── Workspace Members ────────────────────────────────────────────────
export const workspaceMembers = pgTable('workspace_members', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:        memberRoleEnum('role').notNull().default('member'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('workspace_members_workspace_user_idx').on(t.workspaceId, t.userId),
}))

// ── Roles / Features ────────────────────────────────────────────────
export const roles = pgTable('roles', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  key:         text('key').notNull().unique(),
  name:        text('name').notNull(),
  description: text('description'),
  isSystem:    boolean('is_system').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const features = pgTable('features', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  key:         text('key').notNull().unique(),
  name:        text('name').notNull(),
  description: text('description'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const roleFeatures = pgTable('role_features', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  roleId:     text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  featureId:  text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('role_features_role_feature_idx').on(t.roleId, t.featureId),
}))

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  actorUserId: text('actor_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action:      text('action').notNull(),
  targetType:  text('target_type').notNull(),
  targetId:    text('target_id').notNull(),
  metadata:    jsonb('metadata').notNull().default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
})

// ── Boards ───────────────────────────────────────────────────────────
export const boards = pgTable('boards', {
  id:                   text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:          text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:                 text('name').notNull(),
  slug:                 text('slug').notNull().unique(),
  description:          text('description'),
  logoUrl:              text('logo_url'),
  heroImageUrl:         text('hero_image_url'),
  customDomain:         text('custom_domain').unique(),
  railwayDomainId:      text('railway_domain_id'),
  customDomainStatus:   text('custom_domain_status'),
  status:               boardStatusEnum('status').notNull().default('draft'),
  theme:                jsonb('theme').$type<BoardTheme>().notNull(),
  boardConfig:          jsonb('board_config').$type<JobBoardThemeConfig>(),
  introText:            text('intro_text'),
  footerText:           text('footer_text'),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})

// ── Jobs ─────────────────────────────────────────────────────────────
export const jobs = pgTable('jobs', {
  id:                  text('id').primaryKey().$defaultFn(() => createId()),
  boardId:             text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  title:               text('title').notNull(),
  externalApplyUrl:    text('external_apply_url'),
  externalListingUrl:  text('external_listing_url'),
  externalSource:      text('external_source'),
  primaryCategory:     text('primary_category'),
  categoryTags:        text('category_tags').array(),
  company:             text('company'),
  companyLogoUrl:      text('company_logo_url'),
  location:            text('location'),
  remotePolicy:        remotePolicyEnum('remote_policy').notNull().default('onsite'),
  employmentType:      employmentTypeEnum('employment_type').notNull().default('full-time'),
  salaryMin:           integer('salary_min'),
  salaryMax:           integer('salary_max'),
  salaryCurrency:      text('salary_currency').notNull().default('GBP'),
  salaryPeriod:        text('salary_period').notNull().default('annual'),
  descriptionJson:     jsonb('description_json').$type<Record<string, unknown> | null>(),
  description:         text('description').notNull(),
  requirements:        text('requirements'),
  benefits:            text('benefits'),
  applicationDeadline: timestamp('application_deadline'),
  applicationTips:     jsonb('application_tips').$type<{ tips: string[]; generatedAt: string } | null>(),
  status:              jobStatusEnum('status').notNull().default('draft'),
  createdAt:           timestamp('created_at').notNull().defaultNow(),
  updatedAt:           timestamp('updated_at').notNull().defaultNow(),
})

// ── Saved Jobs ───────────────────────────────────────────────────────
export const savedJobs = pgTable('saved_jobs', {
  id:      text('id').primaryKey().$defaultFn(() => createId()),
  userId:  text('user_id').notNull(),
  jobId:   text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at').notNull().defaultNow(),
}, (t) => ({
  uniqueUserJob: uniqueIndex('saved_jobs_user_job_idx').on(t.userId, t.jobId),
  userIdx:       index('saved_jobs_user_idx').on(t.userId),
}))

// ── Candidate Profiles ───────────────────────────────────────────────
export const candidateProfiles = pgTable('candidate_profiles', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  userId:      text('user_id').notNull(),
  name:        text('name'),
  headline:    text('headline'),
  location:    text('location'),
  bio:         text('bio'),
  skills:      text('skills').array(),
  cvUrl:       text('cv_url'),
  linkedinUrl: text('linkedin_url'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueUser: uniqueIndex('candidate_profiles_user_idx').on(t.userId),
}))

// ── Applications ─────────────────────────────────────────────────────
export const applications = pgTable('applications', {
  id:             text('id').primaryKey().$defaultFn(() => createId()),
  jobId:          text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  boardId:        text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  candidateName:  text('candidate_name').notNull(),
  candidateEmail: text('candidate_email').notNull(),
  candidatePhone: text('candidate_phone'),
  cvUrl:          text('cv_url'),
  coverLetter:    text('cover_letter'),
  linkedinUrl:    text('linkedin_url'),
  portfolioUrl:   text('portfolio_url'),
  status:         applicationStatusEnum('status').notNull().default('new'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
})

// ── Relations ────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  workspaceMembers: many(workspaceMembers),
  adminAuditLogs: many(adminAuditLogs),
}))

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner:   one(users, { fields: [workspaces.ownerUserId], references: [users.id] }),
  members: many(workspaceMembers),
  boards:  many(boards),
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user:      one(users,      { fields: [workspaceMembers.userId],      references: [users.id] }),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  roleFeatures: many(roleFeatures),
}))

export const featuresRelations = relations(features, ({ many }) => ({
  roleFeatures: many(roleFeatures),
}))

export const roleFeaturesRelations = relations(roleFeatures, ({ one }) => ({
  role: one(roles, { fields: [roleFeatures.roleId], references: [roles.id] }),
  feature: one(features, { fields: [roleFeatures.featureId], references: [features.id] }),
}))

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  actorUser: one(users, { fields: [adminAuditLogs.actorUserId], references: [users.id] }),
}))

export const boardsRelations = relations(boards, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [boards.workspaceId], references: [workspaces.id] }),
  jobs:      many(jobs),
}))

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  board:        one(boards, { fields: [jobs.boardId], references: [boards.id] }),
  applications: many(applications),
}))

export const applicationsRelations = relations(applications, ({ one }) => ({
  job:   one(jobs,   { fields: [applications.jobId],   references: [jobs.id] }),
  board: one(boards, { fields: [applications.boardId], references: [boards.id] }),
}))
