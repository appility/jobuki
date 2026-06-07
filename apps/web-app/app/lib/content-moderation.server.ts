import { Filter } from 'bad-words'

const filter = new Filter()

// Slugs/names that would conflict with app routes or appear misleading
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'www', 'mail', 'email', 'support', 'help', 'status',
  'blog', 'about', 'contact', 'legal', 'terms', 'privacy', 'security',
  'jobs', 'job', 'careers', 'career', 'work', 'hire', 'hiring',
  'jobuki', 'app', 'dashboard', 'login', 'signin', 'signup', 'sign-in',
  'sign-up', 'logout', 'auth', 'oauth', 'sso', 'account', 'accounts',
  'billing', 'checkout', 'payment', 'payments', 'pricing', 'plans', 'plan',
  'team', 'teams', 'workspace', 'workspaces', 'org', 'orgs',
  'health', 'ping', 'robots', 'sitemap', 'assets', 'static', 'cdn',
  'null', 'undefined', 'test', 'demo', 'example', 'sample', 'placeholder',
])

// Misleading names that aren't in the reserved slug list but shouldn't appear in board names
const RESERVED_NAMES = new Set([
  'jobuki', 'google', 'facebook', 'meta', 'microsoft', 'amazon', 'apple',
  'twitter', 'x', 'linkedin', 'github', 'stripe', 'clerk',
])

export function checkProfanity(value: string): string | null {
  if (!value.trim()) return null
  try {
    if (filter.isProfane(value)) {
      return 'That name contains inappropriate language. Please choose something else.'
    }
  } catch {
    // bad-words can throw on some unicode edge cases — fail open
  }
  return null
}

export function checkReservedSlug(slug: string): string | null {
  const normalized = slug.toLowerCase().trim()
  if (RESERVED_SLUGS.has(normalized)) {
    return `"${slug}" is a reserved word and can't be used as a board slug.`
  }
  return null
}

export function checkReservedName(name: string): string | null {
  const normalized = name.toLowerCase().trim()
  for (const reserved of RESERVED_NAMES) {
    if (normalized === reserved || normalized.startsWith(reserved + ' ') || normalized.endsWith(' ' + reserved)) {
      return `"${name}" contains a reserved or trademarked name. Please choose something else.`
    }
  }
  return null
}

export function validateBoardName(name: string): string | null {
  return checkProfanity(name) ?? checkReservedName(name)
}

export function validateBoardSlug(slug: string): string | null {
  return checkReservedSlug(slug) ?? checkProfanity(slug)
}

export function validateJobTitle(title: string): string | null {
  return checkProfanity(title)
}
