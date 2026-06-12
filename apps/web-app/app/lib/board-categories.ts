import { BOARD_CATEGORY_RULES, resolveCategoryAlias } from './category-config'

// Narrow input type so column-excluded query results still type-check.
// description is optional — keyword fallback simply won't fire if absent.
export type JobForCategory = {
  primaryCategory?: string | null
  categoryTags?: string[] | null
  title: string
  description?: string | null
  employmentType: string
}

export function normalizeCategory(value: string | null | undefined) {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')

  return resolveCategoryAlias(normalized)
}

export function titleCaseCategory(value: string | null | undefined) {
  if (!value) return ''

  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function parseBoardCategories(input: string | null | undefined) {
  return Array.from(
    new Set(
      (input ?? '')
        .split(/[\n,]/)
        .map((item) => normalizeCategory(item))
        .filter(Boolean)
    )
  )
}

export function resolveBoardCategories(input: string[] | null | undefined) {
  return Array.from(new Set((input ?? []).map((item) => normalizeCategory(item)).filter(Boolean))).sort()
}

function hasCategoryTerm(haystack: string, term: string) {
  const normalizedTerm = (term ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (!normalizedTerm) return false

  const normalizedHaystack = ` ${haystack.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
  return normalizedHaystack.includes(` ${normalizedTerm} `)
}

function scoreJobCategories(job: JobForCategory, boardCategories: string[] = []) {
  const configuredCategories = resolveBoardCategories(boardCategories)
  const haystack = [job.title, job.description, job.employmentType].join(' ').toLowerCase()

  const rules = BOARD_CATEGORY_RULES.filter((rule) => !configuredCategories.length || configuredCategories.includes(rule.category))

  return rules
    .map((rule) => {
      const hits = rule.keywords.reduce((count, keyword) => count + (hasCategoryTerm(haystack, keyword) ? 1 : 0), 0)
      const score = hits / Math.max(rule.keywords.length, 1)
      return { category: rule.category, hits, score }
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.hits !== a.hits) return b.hits - a.hits
      return a.category.localeCompare(b.category)
    })
}

export function deriveJobCategory(
  job: JobForCategory,
  boardCategories: string[] = []
) {
  const configuredCategories = resolveBoardCategories(boardCategories)
  const explicit = normalizeCategory(job.primaryCategory)
  if (explicit && (configuredCategories.length === 0 || configuredCategories.includes(explicit))) {
    return explicit
  }

  const tagged = Array.isArray(job.categoryTags)
    ? normalizeCategory(job.categoryTags.find((tag) => normalizeCategory(tag)))
    : ''
  if (tagged && (configuredCategories.length === 0 || configuredCategories.includes(tagged))) {
    return tagged
  }

  const haystack = [job.title, job.description, job.employmentType].join(' ').toLowerCase()

  // For board-owned taxonomies, map by searching job text for the creator category labels.
  if (configuredCategories.length > 0) {
    const matchedConfigured = configuredCategories.find((category) => {
      const needle = category.replace(/-/g, ' ')
      return hasCategoryTerm(haystack, needle)
    })
    if (matchedConfigured) return matchedConfigured
  }

  const inferred = scoreJobCategories(job, boardCategories)[0]?.category ?? ''

  if (!configuredCategories.length) return inferred
  if (inferred && configuredCategories.includes(inferred)) return inferred
  return ''
}

export function getDisplayCategoryTags(
  job: JobForCategory,
  boardCategories: string[] = [],
  limit = 3
) {
  const primary = normalizeCategory(deriveJobCategory(job, boardCategories))
  const ranked = scoreJobCategories(job, boardCategories).map((entry) => entry.category)
  const explicitTags = Array.isArray(job.categoryTags)
    ? job.categoryTags.map((tag) => normalizeCategory(tag)).filter(Boolean)
    : []

  const preferredTags = ranked.length > 0 ? ranked : explicitTags

  return Array.from(new Set(preferredTags))
    .filter((tag) => tag && tag !== primary)
    .slice(0, limit)
}