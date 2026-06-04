import { type RouteConfig, route, index, layout } from '@react-router/dev/routes'

export default [
  // ── Marketing ──────────────────────────────────────────────────────
  index('routes/marketing/home.tsx'),
  route('for/:market', 'routes/marketing/market.tsx'),

  // ── Auth ──────────────────────────────────────────────────────────
  route('sign-in',       'routes/sign-in.tsx'),
  route('sign-up',       'routes/sign-up.tsx'),
  route('sso-callback',  'routes/sso-callback.tsx'),

  // ── API ───────────────────────────────────────────────────────────
  route('api/upload-sign', 'routes/api/upload-sign.ts'),
  route('api/upload-image', 'routes/api/upload-image.ts'),
  route('health', 'routes/health.ts'),
  route('admin', 'routes/platform-admin/index.tsx'),

  // ── Onboarding (auth required, no workspace needed) ────────────────
  route('dashboard/onboarding', 'routes/admin/onboarding.tsx'),
  route('candidate',            'routes/candidate/index.tsx'),
  route('candidate/start',      'routes/candidate/start.tsx'),

  // ── Admin (auth + workspace required) ─────────────────────────────
  layout('routes/admin/layout.tsx', [
    route('dashboard',                'routes/admin/dashboard.tsx'),
    route('dashboard/boards',         'routes/admin/boards/index.tsx'),
    route('dashboard/boards/new',     'routes/admin/boards/new.tsx'),
    route('dashboard/boards/:id',        'routes/admin/boards/show.tsx'),
    route('dashboard/boards/:id/domain', 'routes/admin/boards/domain.tsx'),
    route('dashboard/appearance/:id',    'routes/admin/appearance.tsx'),
    route('dashboard/jobs',           'routes/admin/jobs/index.tsx'),
    route('dashboard/jobs/new',       'routes/admin/jobs/new.tsx'),
    route('dashboard/jobs/:id',       'routes/admin/jobs/edit.tsx'),
    route('dashboard/applications',   'routes/admin/applications/index.tsx'),
  ]),

  // ── Public board (resolved from subdomain/custom domain by server) ─
  layout('routes/board/layout.tsx', [
    route('jobs/:jobId',  'routes/board/job.tsx'),
    route('apply/:jobId', 'routes/board/apply.tsx'),
  ]),
] satisfies RouteConfig
