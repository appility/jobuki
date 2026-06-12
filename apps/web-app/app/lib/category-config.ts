export type CategoryRule = {
  category: string
  keywords: string[]
}

export type SourcePriorRule = {
  category: string
  sourceTerms: string[]
}

export type SourceCategoryStrategy = 'single-category' | 'mixed' | 'search-driven'

export type SourceCategoryMapEntry = {
  sourceKeys: string[]
  strategy: SourceCategoryStrategy
  categories: string[]
}

export type IndustryConfig = {
  name: string
  aliases: string[]
  categories: string[]
}

function normalizeCategoryToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  health: [
    'health-care',
    'healthcare',
    'medical',
    'clinical',
    'nursing',
    'registered-nurse',
    'rn',
    'doctor',
    'physician',
    'hospital',
    'therapy',
    'therapist',
    'allied-health',
    'biotech',
  ],
  green: [
    'climate',
    'climate-tech',
    'greentech',
    'clean-tech',
    'clean-energy',
    'renewables',
    'renewable-energy',
    'sustainability',
    'sustainable',
    'net-zero',
    'decarbonization',
    'decarbonisation',
    'esg',
    'environment',
    'environmental',
  ],
  finance: [
    'fintech',
    'accounting',
    'bookkeeping',
    'accounts-payable',
    'accounts-receivable',
    'fpanda',
    'financial-planning-and-analysis',
    'audit',
    'compliance',
    'treasury',
    'banking',
    'investment',
  ],
  education: [
    'teaching',
    'teacher',
    'lecturer',
    'tutor',
    'school',
    'university',
    'academic',
    'instructional-design',
    'curriculum',
    'learning-and-development',
    'edtech',
  ],
  logistics: [
    'supply-chain',
    'transport',
    'transportation',
    'shipping',
    'warehouse',
    'distribution',
    'fleet',
    'procurement',
    'inventory',
    'fulfillment',
  ],
  apprenticeship: [
    'apprentice',
    'school-leaver',
    'trainee',
    'entry-level-trainee',
    'graduate-apprentice',
  ],
  crypto: [
    'web3',
    'blockchain',
    'defi',
    'solidity',
    'onchain',
  ],
}

// Hierarchical industry structure for backfill UI
// Keys match the flat category names used in primaryCategory field
// but include hierarchical subcategories for UI navigation
export const INDUSTRIES: Record<string, IndustryConfig> = {
  health: {
    name: 'Healthcare',
    aliases: ['healthcare', 'medical', 'clinical', 'hospital'],
    categories: ['nursing', 'clinical', 'therapy', 'paramedic', 'biotech'],
  },
  finance: {
    name: 'Finance',
    aliases: ['financial', 'accounting', 'banking'],
    categories: ['accounting', 'audit', 'banking', 'investment', 'tax'],
  },
  education: {
    name: 'Education',
    aliases: ['academic', 'learning', 'school', 'university'],
    categories: ['teaching', 'curriculum', 'academic', 'instructional-design'],
  },
  logistics: {
    name: 'Logistics',
    aliases: ['supply-chain', 'transportation', 'shipping'],
    categories: ['supply-chain', 'warehouse', 'distribution', 'procurement'],
  },
  green: {
    name: 'Green & Sustainability',
    aliases: ['environment', 'climate', 'renewable', 'sustainability'],
    categories: ['renewable', 'sustainability', 'climate-tech', 'net-zero'],
  },
  crypto: {
    name: 'Crypto & Web3',
    aliases: ['web3', 'blockchain', 'defi'],
    categories: ['blockchain', 'defi', 'web3-general'],
  },
  engineering: {
    name: 'Technology & Engineering',
    aliases: ['software', 'development', 'tech'],
    categories: ['backend', 'frontend', 'fullstack', 'data', 'security', 'devops'],
  },
  apprenticeship: {
    name: 'Apprenticeships',
    aliases: ['trainee', 'entry-level', 'graduate-apprentice'],
    categories: ['entry-level-general', 'entry-level-tech', 'entry-level-trades'],
  },
}

const CATEGORY_ALIAS_LOOKUP = Object.entries(CATEGORY_ALIASES).reduce<Record<string, string>>((acc, [category, aliases]) => {
  acc[category] = category
  for (const alias of aliases) {
    acc[normalizeCategoryToken(alias)] = category
  }
  return acc
}, {})

export function resolveCategoryAlias(value: string | null | undefined): string {
  const normalized = normalizeCategoryToken(value ?? '')
  if (!normalized) return ''
  return CATEGORY_ALIAS_LOOKUP[normalized] ?? normalized
}

function withCategoryAliases(rules: CategoryRule[]): CategoryRule[] {
  return rules.map((rule) => {
    const aliases = CATEGORY_ALIASES[rule.category] ?? []
    return {
      ...rule,
      keywords: Array.from(new Set([...rule.keywords, ...aliases.map((alias) => alias.replace(/-/g, ' '))])),
    }
  })
}

// Board-side derivation rules. Order matters because deriveJobCategory uses first match.
export const BOARD_CATEGORY_RULES: CategoryRule[] = withCategoryAliases([
  { category: 'apprenticeship', keywords: ['apprentice', 'apprenticeship', 'school leaver', 'graduate apprentice', 'entry level trainee'] },
  { category: 'health', keywords: ['healthcare', 'clinical', 'hospital', 'medical', 'nurse', 'doctor', 'physician', 'paramedic', 'therapist'] },
  { category: 'green', keywords: ['environmental', 'sustainability', 'renewable', 'solar', 'wind', 'climate', 'net zero', 'decarbonization'] },
  { category: 'finance', keywords: ['finance', 'accountant', 'accounting', 'bookkeeper', 'controller', 'cfo', 'audit', 'tax', 'payroll', 'financial analyst'] },
  { category: 'education', keywords: ['teacher', 'teaching', 'educator', 'lecturer', 'tutor', 'instructor', 'curriculum', 'academic', 'school', 'university'] },
  { category: 'logistics', keywords: ['logistics', 'supply chain', 'warehouse', 'shipping', 'freight', 'dispatch', 'inventory', 'procurement', 'transport', 'distribution'] },
  { category: 'engineering', keywords: ['engineer', 'developer', 'typescript', 'backend', 'frontend', 'full stack', 'solidity', 'rust', 'golang', 'python'] },
  { category: 'product', keywords: ['product manager', 'product owner', 'roadmap'] },
  { category: 'design', keywords: ['designer', 'ux', 'ui', 'figma', 'product design'] },
  { category: 'data', keywords: ['data', 'analytics', 'machine learning', 'ai', 'scientist'] },
  { category: 'marketing', keywords: ['marketing', 'growth', 'seo', 'content', 'social'] },
  { category: 'sales', keywords: ['sales', 'account executive', 'business development', 'bdr', 'partnership'] },
  { category: 'operations', keywords: ['operations', 'ops', 'program manager', 'project manager'] },
  { category: 'security', keywords: ['security', 'infosec', 'application security', 'devsecops'] },
  { category: 'devrel', keywords: ['developer relations', 'devrel', 'advocate', 'community manager'] },
])

// Ingest-side inference rules. These can differ from board fallback behavior.
export const INGEST_CATEGORY_RULES: CategoryRule[] = withCategoryAliases([
  { category: 'health', keywords: ['healthcare', 'clinical', 'hospital', 'medical', 'nurse', 'doctor', 'physician', 'paramedic', 'therapist'] },
  { category: 'green', keywords: ['environmental', 'sustainability', 'renewable', 'solar', 'wind', 'climate', 'net zero', 'decarbonization'] },
  { category: 'finance', keywords: ['finance', 'accountant', 'accounting', 'bookkeeper', 'controller', 'cfo', 'audit', 'tax', 'payroll', 'financial analyst'] },
  { category: 'education', keywords: ['teacher', 'teaching', 'educator', 'lecturer', 'tutor', 'instructor', 'curriculum', 'academic', 'school', 'university'] },
  { category: 'logistics', keywords: ['logistics', 'supply chain', 'warehouse', 'shipping', 'freight', 'dispatch', 'inventory', 'procurement', 'transport', 'distribution'] },
  { category: 'engineering', keywords: ['engineer', 'developer', 'typescript', 'backend', 'frontend', 'full stack', 'solidity', 'rust', 'golang', 'python'] },
  { category: 'crypto', keywords: ['crypto', 'web3', 'blockchain', 'defi', 'solana', 'ethereum', 'bitcoin'] },
  { category: 'apprenticeship', keywords: ['apprentice', 'apprenticeship', 'school leaver', 'graduate apprentice', 'entry level trainee'] },
  { category: 'product', keywords: ['product manager', 'product owner', 'roadmap'] },
  { category: 'design', keywords: ['designer', 'ux', 'ui', 'figma', 'product design'] },
  { category: 'data', keywords: ['data', 'analytics', 'machine learning', 'ai', 'scientist'] },
  { category: 'marketing', keywords: ['marketing', 'growth', 'seo', 'content', 'social'] },
  { category: 'sales', keywords: ['sales', 'account executive', 'business development', 'bdr', 'partnership'] },
  { category: 'operations', keywords: ['operations', 'ops', 'program manager', 'project manager'] },
  { category: 'security', keywords: ['security', 'infosec', 'application security', 'devsecops'] },
  { category: 'devrel', keywords: ['developer relations', 'devrel', 'advocate', 'community manager'] },
])

export const SOURCE_PRIOR_RULES: SourcePriorRule[] = [
  {
    category: 'crypto',
    sourceTerms: [
      'cryptojobslist',
      'hireweb3',
      'web3',
      'blockchain',
      'defi',
      'coin',
      'crypto',
    ],
  },
]

// Source-level mapping for category strategy:
// - single-category: source is niche and category can be pinned confidently.
// - mixed: source is broad, use text inference and optional source priors.
// - search-driven: broad source where vertical categories are usually best pulled via search terms.
export const SOURCE_CATEGORY_MAP: SourceCategoryMapEntry[] = [
  {
    sourceKeys: ['cryptojobslist_api_rss', 'cryptojobslist_remote_rss', 'cryptojobslist', 'hireweb3_rss', 'hireweb3'],
    strategy: 'single-category',
    categories: ['crypto'],
  },
  {
    sourceKeys: ['remoteok_rss_crypto_web3', 'remoteok_rss_web3', 'remoteok_json_crypto', 'remoteok_json_web3'],
    strategy: 'single-category',
    categories: ['crypto'],
  },
  {
    sourceKeys: ['jobicy_rss_crypto', 'jobicy_rss_blockchain', 'jobicy_json_crypto', 'jobicy_json_blockchain', 'jobicy_json_web3'],
    strategy: 'single-category',
    categories: ['crypto'],
  },
  {
    sourceKeys: ['reed_json', 'adzuna_json', 'remotive_json', 'arbeitnow_json', 'himalayas_json', 'weworkremotely_rss', 'workingnomads_rss', 'govuk_atom'],
    strategy: 'search-driven',
    categories: [],
  },
]

export const CATEGORY_SEARCH_PROFILES: Record<string, string[]> = {
  apprenticeship: ['apprentice', 'apprenticeship', 'school leaver', 'entry level trainee'],
  green: ['environmental', 'climate', 'sustainability', 'renewable', 'solar', 'wind', 'net zero', 'decarbonization'],
  health: ['healthcare', 'clinical', 'hospital', 'medical', 'nurse', 'doctor', 'physician', 'therapist', 'paramedic', 'biotech'],
  finance: ['finance', 'accounting', 'accountant', 'auditor', 'payroll', 'bookkeeper', 'controller', 'banking', 'investment'],
  education: ['teacher', 'teaching', 'educator', 'lecturer', 'tutor', 'instructor', 'curriculum', 'school', 'academic'],
  logistics: ['logistics', 'supply chain', 'warehouse', 'shipping', 'freight', 'dispatch', 'inventory', 'procurement', 'distribution'],
  crypto: ['crypto', 'web3', 'blockchain', 'defi'],
}

export function resolveSourceCategoryHint(sourceHint: string): {
  strategy: SourceCategoryStrategy | null
  primaryCategory: string | null
  categories: string[]
} {
  const normalizedHint = sourceHint.toLowerCase()
  const match = SOURCE_CATEGORY_MAP.find((entry) => entry.sourceKeys.some((key) => normalizedHint.includes(key.toLowerCase())))

  if (!match) {
    return {
      strategy: null,
      primaryCategory: null,
      categories: [],
    }
  }

  const primaryCategory = match.strategy === 'single-category' && match.categories.length === 1
    ? match.categories[0]
    : null

  return {
    strategy: match.strategy,
    primaryCategory,
    categories: match.categories,
  }
}

// Hierarchical industry navigation helpers
export function getIndustries(): string[] {
  return Object.keys(INDUSTRIES)
}

export function getIndustryCategories(industry: string): string[] {
  return INDUSTRIES[industry]?.categories ?? []
}

export function getIndustryDisplayName(industry: string): string {
  return INDUSTRIES[industry]?.name ?? industry
}

export function isValidIndustry(value: string): boolean {
  return value in INDUSTRIES
}

export function isValidIndustryCategory(industry: string, category: string): boolean {
  return getIndustryCategories(industry).includes(category)
}

// Build a reverse map: category → industry
const CATEGORY_TO_INDUSTRY: Record<string, string> = {}
for (const [industry, config] of Object.entries(INDUSTRIES)) {
  for (const category of config.categories) {
    CATEGORY_TO_INDUSTRY[category] = industry
  }
}

export function getIndustryForCategory(category: string): string | null {
  return CATEGORY_TO_INDUSTRY[category] ?? null
}
