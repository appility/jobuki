import { describe, it, expect } from 'vitest'
import { normalizeCategory, titleCaseCategory, parseBoardCategories, resolveBoardCategories, deriveJobCategory } from '../board-categories'

const makeJob = (overrides: Partial<{ title: string; description: string; primaryCategory: string | null; categoryTags: string[]; employmentType: string }> = {}) => ({
  id: 'test',
  boardId: 'b1',
  title: 'Software Engineer',
  description: 'An exciting opportunity at a fast growing company.',
  primaryCategory: null,
  categoryTags: [],
  employmentType: 'full-time',
  company: null,
  location: null,
  remotePolicy: 'remote',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: 'GBP',
  salaryPeriod: null,
  requirements: null,
  benefits: null,
  status: 'published',
  externalApplyUrl: null,
  externalListingUrl: null,
  externalSource: null,
  companyLogoUrl: null,
  descriptionJson: null,
  applicationTips: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as any)

describe('normalizeCategory', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(normalizeCategory('Software Engineering')).toBe('software-engineering')
    expect(normalizeCategory('UX Design')).toBe('ux-design')
  })

  it('strips special characters', () => {
    expect(normalizeCategory('C++ Developer')).toBe('c-developer')
    expect(normalizeCategory('AI/ML')).toBe('aiml')
  })

  it('handles null/undefined', () => {
    expect(normalizeCategory(null)).toBe('')
    expect(normalizeCategory(undefined)).toBe('')
  })

  it('maps industry aliases to canonical categories', () => {
    expect(normalizeCategory('RN')).toBe('health')
    expect(normalizeCategory('ESG')).toBe('green')
    expect(normalizeCategory('FinTech')).toBe('finance')
    expect(normalizeCategory('Supply Chain')).toBe('logistics')
  })
})

describe('titleCaseCategory', () => {
  it('capitalises each word', () => {
    expect(titleCaseCategory('software-engineering')).toBe('Software Engineering')
    expect(titleCaseCategory('ux-design')).toBe('Ux Design')
    expect(titleCaseCategory('devrel')).toBe('Devrel')
  })

  it('handles null/empty', () => {
    expect(titleCaseCategory(null)).toBe('')
    expect(titleCaseCategory('')).toBe('')
  })
})

describe('parseBoardCategories', () => {
  it('parses newline-separated categories', () => {
    expect(parseBoardCategories('Engineering\nDesign\nProduct')).toEqual(['engineering', 'design', 'product'])
  })

  it('parses comma-separated categories', () => {
    expect(parseBoardCategories('Engineering, Design, Product')).toEqual(['engineering', 'design', 'product'])
  })

  it('deduplicates', () => {
    expect(parseBoardCategories('Engineering\nengineering\nDesign')).toEqual(['engineering', 'design'])
  })

  it('handles empty input', () => {
    expect(parseBoardCategories('')).toEqual([])
    expect(parseBoardCategories(null)).toEqual([])
  })
})

describe('deriveJobCategory', () => {
  it('returns primaryCategory when set and no board categories', () => {
    const job = makeJob({ primaryCategory: 'engineering' })
    expect(deriveJobCategory(job, [])).toBe('engineering')
  })

  it('infers category from title keywords', () => {
    const job = makeJob({ title: 'Senior Frontend Developer', primaryCategory: null })
    expect(deriveJobCategory(job, [])).toBe('engineering')
  })

  it('infers product category', () => {
    const job = makeJob({ title: 'Product Manager', primaryCategory: null })
    expect(deriveJobCategory(job, [])).toBe('product')
  })

  it('infers design category', () => {
    const job = makeJob({ title: 'UX Designer', primaryCategory: null })
    expect(deriveJobCategory(job, [])).toBe('design')
  })

  it('infers apprenticeship category', () => {
    const job = makeJob({ title: 'Software Engineering Apprenticeship', primaryCategory: null })
    expect(deriveJobCategory(job, [])).toBe('apprenticeship')
  })

  it('returns empty string when no keyword match and board categories are set', () => {
    const job = makeJob({ title: 'Legal Counsel', primaryCategory: null, categoryTags: [] })
    expect(deriveJobCategory(job, ['engineering', 'design'])).toBe('')
  })

  it('respects board category filter', () => {
    // Job is engineering but board only has design/product
    const job = makeJob({ title: 'Senior Engineer', primaryCategory: 'engineering' })
    expect(deriveJobCategory(job, ['design', 'product'])).toBe('')
  })

  it('falls back to categoryTags when primaryCategory is null', () => {
    const job = makeJob({ primaryCategory: null, categoryTags: ['engineering', 'typescript'] })
    expect(deriveJobCategory(job, [])).toBe('engineering')
  })
})
