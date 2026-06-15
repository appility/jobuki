import { type RouteConfig, route, index, layout } from '@react-router/dev/routes'

export default [
  // ── Marketing ──────────────────────────────────────────────────────
  route('for/:type', 'routes/marketing/market.tsx'),

  // ── Auth ──────────────────────────────────────────────────────────
  route('sign-in',       'routes/sign-in.tsx', { id: 'sign-in' }),
  route('sign-in/*',     'routes/sign-in.tsx', { id: 'sign-in-wildcard' }),
  route('sign-up',       'routes/sign-up.tsx', { id: 'sign-up' }),
  route('sign-up/*',     'routes/sign-up.tsx', { id: 'sign-up-wildcard' }),
  route('sso-callback',  'routes/sso-callback.tsx'),

  // ── API ───────────────────────────────────────────────────────────
  route('api/upload-sign', 'routes/api/upload-sign.ts'),
  route('api/upload-image', 'routes/api/upload-image.ts'),
  route('api/upload-cv', 'routes/api/upload-cv.ts'),
  route('api/cv/download-url', 'routes/api/cv/cv-download-url.ts'),
  route('api/cv/download', 'routes/api/cv/cv-download.ts'),
  route('api/cv/preview', 'routes/api/cv/cv-preview.ts'),
  route('api/ingest-jobs', 'routes/api/ingest-jobs.ts'),
  route('api/cron/process-alerts', 'routes/api/cron.process-alerts.ts'),
  route('api/jobs/save', 'routes/api/jobs/save-job.ts'),
  route('api/applications/log-apply', 'routes/api/applications/log-apply.ts'),
  route('api/applications/apply-prep', 'routes/api/applications/apply-prep.ts'),
  route('api/auth/access-check', 'routes/api/auth/admin.access-check.ts'),
  route('health', 'routes/health.ts'),
  route('robots.txt', 'routes/robots.ts'),

  // ── Platform Admin (Jobuki staff only) ──────────────────────────────
  layout('routes/platform-admin/layout.tsx', [
    route('admin', 'routes/platform-admin/index.tsx'),
    route('admin/tiers', 'routes/platform-admin/tiers.tsx'),
    route('admin/publishers', 'routes/platform-admin/publishers.tsx'),
    route('admin/candidates', 'routes/platform-admin/candidates.tsx'),
  ]),

  // ── Onboarding (auth required, no workspace needed) ────────────────
  route('dashboard/onboarding', 'routes/dashboard/onboarding.tsx'),
  route('candidate/start', 'routes/candidate/start.tsx'),
  route('hiring/start',        'routes/hiring/start.tsx'),

  // ── Hiring Flow ────────────────────────────────────────────────────
  layout('routes/hiring/layout.tsx', [
    route('hiring',              'routes/hiring/index.tsx'),
    route('hiring/listings',     'routes/hiring/listings.tsx'),
    route('hiring/applications', 'routes/hiring/applications.tsx'),
    route('hiring/billing',      'routes/hiring/billing.tsx'),
    route('hiring/status',       'routes/hiring/status.tsx'),
  ]),

  // ── Board Creator Dashboard (auth + workspace required) ────────────
  layout('routes/dashboard/layout.tsx', [
    route('dashboard',                'routes/dashboard/index.tsx'),
    route('dashboard/boards',         'routes/dashboard/boards/index.tsx'),
    route('dashboard/boards/new',     'routes/dashboard/boards/new.tsx'),
    route('dashboard/boards/:id',        'routes/dashboard/boards/show.tsx'),
    route('dashboard/boards/:id/appearance', 'routes/dashboard/appearance.tsx'),
    route('dashboard/boards/:id/content',       'routes/dashboard/boards/content.tsx'),
    route('dashboard/boards/:id/import',        'routes/dashboard/boards/import.tsx'),
    route('dashboard/boards/:id/domain',        'routes/dashboard/boards/domain.tsx'),
    route('dashboard/boards/:id/integrations',  'routes/dashboard/boards/integrations.tsx'),
    route('dashboard/boards/:id/settings',      'routes/dashboard/boards/settings.tsx'),
    route('dashboard/jobs',           'routes/dashboard/jobs/index.tsx'),
    route('dashboard/jobs/new',       'routes/dashboard/jobs/new.tsx'),
    route('dashboard/jobs/:id',       'routes/dashboard/jobs/edit.tsx'),
    route('dashboard/monetization',   'routes/dashboard/monetization.tsx'),
    route('dashboard/billing',        'routes/dashboard/billing.tsx'),
    route('dashboard/applications',   'routes/dashboard/applications/index.tsx'),
    route('dashboard/applications/:jobId', 'routes/dashboard/applications/$jobId.tsx'),
    route('dashboard/applications/:jobId/:applicationId', 'routes/dashboard/applications/$jobId/$applicationId.tsx'),
    route('dashboard/users',           'routes/dashboard/users/index.tsx'),
  ]),

  // ── Public Job Board & Candidate Shell ─────────────────────────────
  route('sitemap.xml', 'routes/board/sitemap.ts'),
  layout('routes/shared-shell.tsx', [
    layout('routes/candidate/layout.tsx', [
      route('candidate',                  'routes/candidate/overview.tsx'),
      route('candidate/saved',            'routes/candidate/saved.tsx'),
      route('candidate/applications',     'routes/candidate/applications.tsx'),
      route('candidate/alerts',           'routes/candidate/alerts.tsx'),
      route('candidate/profile',          'routes/candidate/profile.tsx'),
      route('candidate/cv-preview',       'routes/candidate/cv-preview.tsx'),
    ]),
    layout('routes/board/layout.tsx', [
      index('routes/marketing/home.tsx'),
      route('jobs',        'routes/board/index.tsx'),
      route('jobs/category/:category', 'routes/board/category.tsx'),
      route('about',   'routes/board/about.tsx'),
      route('privacy', 'routes/board/privacy.tsx'),
      route('jobs/:jobId', 'routes/board/job-legacy.tsx'),
      route('jobs/:jobId/:jobTitle',  'routes/board/job.tsx'),
      route('apply/:jobId', 'routes/board/apply.tsx'),
      route('apply/:jobId/form', 'routes/board/apply-form.tsx'),
      route('apply/:jobId/success', 'routes/board/apply-success.tsx'),
    ]),
    route('profile/:handle', 'routes/$handle.tsx'),
  ]),
] satisfies RouteConfig
