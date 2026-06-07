// ── Board ────────────────────────────────────────────────────────────
export type BoardStatus = 'draft' | 'live' | 'suspended'
export type HeaderStyle = 'minimal' | 'bold' | 'coloured'
export type ButtonStyle = 'rounded' | 'pill' | 'sharp'
export type JobBoardHeaderStyle = 'solid' | 'gradient' | 'image'
export type JobBoardThemePreset = 'minimal' | 'startup' | 'editorial' | 'bold' | 'dark'
export type JobBoardEmptyStateIcon = 'search' | 'briefcase' | 'sparkle' | 'inbox'
export type JobBoardJobsLayout = 'list' | 'boxes' | 'bento'
export type BoardOwnerType = 'recruiter' | 'company' | 'community'

export interface BoardMonetizationConfig {
  enabled: boolean
  currency: string
  defaultListingPrice: number | null
  featuredListingPrice: number | null
  requiresApprovalForPaidListings: boolean
}

export interface JobBoardThemeConfig {
  boardName: string
  ownerType?: BoardOwnerType
  categories?: string[]
  tagline?: string
  logoUrl?: string
  headerImageUrl?: string
  brandColor: string
  accentColor?: string
  backgroundColor?: string
  headerStyle: JobBoardHeaderStyle
  themePreset: JobBoardThemePreset
  jobsLayout: JobBoardJobsLayout
  showSearch: boolean
  showFilters: boolean
  emptyState: {
    icon?: JobBoardEmptyStateIcon
    title: string
    description: string
    ctaLabel?: string
    ctaUrl?: string
  }
  footer: {
    showPoweredBy: boolean
    xUrl?: string
    linkedinUrl?: string
    companyWebsiteUrl?: string
  }
  monetization?: BoardMonetizationConfig
}

export interface BoardTheme {
  // Brand
  colorPrimary: string
  colorPrimaryFg: string
  colorAccent: string
  colorAccentFg: string
  // Surface
  colorBackground: string
  colorSurface: string
  colorSurfaceSubtle: string
  // Text
  colorTextPrimary: string
  colorTextSecondary: string
  colorTextMuted: string
  // Border
  colorBorder: string
  colorBorderStrong: string
  // Typography
  fontDisplay: string
  fontBody: string
  // Shape
  radiusSm: string
  radiusMd: string
  radiusLg: string
  radiusXl: string
  radius2xl: string
  // Header
  headerStyle: HeaderStyle
  // Button
  buttonStyle: ButtonStyle
  // Board visual tuning
  boardAmbientPrimary: string
  boardAmbientAccent: string
  boardHeroTint: string
  boardCardTint: string
  boardHeaderSurfaceMix: string
  boardHeaderBlur: string
}

export interface Board {
  id: string
  workspaceId: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  heroImageUrl: string | null
  customDomain: string | null
  railwayDomainId: string | null
  customDomainStatus: 'pending_dns' | 'active' | 'failed' | null
  status: BoardStatus
  theme: BoardTheme
  boardConfig: JobBoardThemeConfig | null
  introText: string | null
  footerText: string | null
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  clerkUserId: string
  isPlatformAdmin: boolean
  accountType: AccountType
  email: string
  name: string | null
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}

// ── Job ──────────────────────────────────────────────────────────────
export type JobStatus = 'draft' | 'published' | 'closed'
export type RemotePolicy = 'remote' | 'hybrid' | 'onsite'
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship'

export interface Job {
  id: string
  boardId: string
  title: string
  externalApplyUrl: string | null
  externalListingUrl: string | null
  externalSource: string | null
  company: string | null
  location: string | null
  remotePolicy: RemotePolicy
  employmentType: EmploymentType
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string
  salaryPeriod: 'annual' | 'monthly' | 'daily' | 'hourly'
  description: string
  requirements: string | null
  benefits: string | null
  applicationDeadline: Date | null
  status: JobStatus
  createdAt: Date
  updatedAt: Date
}

// ── Application ──────────────────────────────────────────────────────
export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'

export interface Application {
  id: string
  jobId: string
  boardId: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string | null
  cvUrl: string | null
  coverLetter: string | null
  linkedinUrl: string | null
  portfolioUrl: string | null
  status: ApplicationStatus
  createdAt: Date
  updatedAt: Date
}

// ── Workspace ────────────────────────────────────────────────────────
export interface Workspace {
  id: string
  name: string
  slug: string
  clerkOrgId: string | null
  plan: 'free' | 'growth' | 'scale'
  createdAt: Date
}

export type AccountType = 'board_creator' | 'job_seeker' | 'job_poster'
export type CreatorPlan = Workspace['plan']

export const CREATOR_PLAN_BOARD_LIMITS: Record<CreatorPlan, number> = {
  free: 1,
  growth: 5,
  scale: 50,
}

export function getCreatorBoardLimit(plan: CreatorPlan) {
  return CREATOR_PLAN_BOARD_LIMITS[plan]
}

// ── Context (passed from Express → RR7 loaders) ──────────────────────
export interface AppLoadContext {
  boardSlug?: string
  boardHostname?: string
  boardType?: 'subdomain' | 'custom' | null
}

// ── Default theme ────────────────────────────────────────────────────
export const DEFAULT_THEME: BoardTheme = {
  colorPrimary: '#3730A3',
  colorPrimaryFg: '#ffffff',
  colorAccent: '#F97316',
  colorAccentFg: '#ffffff',
  colorBackground: '#FAFAF8',
  colorSurface: '#ffffff',
  colorSurfaceSubtle: '#F5F4F2',
  colorTextPrimary: '#1C1917',
  colorTextSecondary: '#78716C',
  colorTextMuted: '#A8A29E',
  colorBorder: '#E7E5E4',
  colorBorderStrong: '#D6D3D1',
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody: "'DM Sans', sans-serif",
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '14px',
  radiusXl: '18px',
  radius2xl: '24px',
  headerStyle: 'minimal',
  buttonStyle: 'rounded',
  boardAmbientPrimary: '8%',
  boardAmbientAccent: '7%',
  boardHeroTint: '8%',
  boardCardTint: '4%',
  boardHeaderSurfaceMix: '88%',
  boardHeaderBlur: '8px',
}

export const DEFAULT_JOB_BOARD_THEME_CONFIG: JobBoardThemeConfig = {
  boardName: 'Jobs',
  ownerType: 'company',
  categories: [],
  tagline: '',
  logoUrl: '',
  headerImageUrl: '',
  brandColor: '#3730A3',
  accentColor: '#F97316',
  backgroundColor: '#FAFAF8',
  headerStyle: 'solid',
  themePreset: 'minimal',
  jobsLayout: 'bento',
  showSearch: true,
  showFilters: true,
  emptyState: {
    icon: 'search',
    title: 'No open positions right now',
    description: 'Check back soon — new roles are added regularly.',
    ctaLabel: '',
    ctaUrl: '',
  },
  footer: {
    showPoweredBy: true,
    xUrl: '',
    linkedinUrl: '',
    companyWebsiteUrl: '',
  },
  monetization: {
    enabled: false,
    currency: 'GBP',
    defaultListingPrice: null,
    featuredListingPrice: null,
    requiresApprovalForPaidListings: true,
  },
}

export function resolveJobBoardThemeConfig(
  partial: Partial<JobBoardThemeConfig> | null | undefined,
  fallbacks: {
    boardName?: string
    tagline?: string
    logoUrl?: string
    headerImageUrl?: string
    brandColor?: string
    accentColor?: string
    backgroundColor?: string
  } = {}
): JobBoardThemeConfig {
  const merged = {
    ...DEFAULT_JOB_BOARD_THEME_CONFIG,
    ...(partial ?? {}),
    emptyState: {
      ...DEFAULT_JOB_BOARD_THEME_CONFIG.emptyState,
      ...(partial?.emptyState ?? {}),
    },
    footer: {
      ...DEFAULT_JOB_BOARD_THEME_CONFIG.footer,
      ...(partial?.footer ?? {}),
    },
    monetization: {
      ...DEFAULT_JOB_BOARD_THEME_CONFIG.monetization,
      ...(partial?.monetization ?? {}),
    },
  }

  const hasTagline = typeof partial?.tagline === 'string'
  const hasLogoUrl = typeof partial?.logoUrl === 'string'
  const hasHeaderImageUrl = typeof partial?.headerImageUrl === 'string'

  return {
    ...merged,
    boardName: merged.boardName || fallbacks.boardName || DEFAULT_JOB_BOARD_THEME_CONFIG.boardName,
    tagline: hasTagline ? (partial?.tagline ?? '') : (fallbacks.tagline ?? merged.tagline ?? ''),
    logoUrl: hasLogoUrl ? (partial?.logoUrl ?? '') : (fallbacks.logoUrl ?? merged.logoUrl ?? ''),
    headerImageUrl: hasHeaderImageUrl ? (partial?.headerImageUrl ?? '') : (fallbacks.headerImageUrl ?? merged.headerImageUrl ?? ''),
    brandColor: merged.brandColor || fallbacks.brandColor || DEFAULT_JOB_BOARD_THEME_CONFIG.brandColor,
    accentColor: merged.accentColor || fallbacks.accentColor || DEFAULT_JOB_BOARD_THEME_CONFIG.accentColor,
    backgroundColor: merged.backgroundColor || fallbacks.backgroundColor || DEFAULT_JOB_BOARD_THEME_CONFIG.backgroundColor,
  }
}
