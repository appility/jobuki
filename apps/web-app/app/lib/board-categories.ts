import type { jobs } from '@jobuki/db'
import { BOARD_CATEGORY_RULES, resolveCategoryAlias } from './category-config'

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

export function deriveJobCategory(
  job: typeof jobs.$inferSelect,
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
      return haystack.includes(needle)
    })
    if (matchedConfigured) return matchedConfigured
  }

  const inferred = BOARD_CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)))?.category ?? ''

  if (!configuredCategories.length) return inferred
  if (inferred && configuredCategories.includes(inferred)) return inferred
  return ''
}