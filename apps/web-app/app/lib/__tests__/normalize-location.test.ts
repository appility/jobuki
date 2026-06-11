import { describe, it, expect } from 'vitest'
import { normalizeLocation, normalizeLocations } from '../normalize-location'

describe('normalizeLocation', () => {
  it('returns empty string for null/undefined', () => {
    expect(normalizeLocation(null)).toBe('')
    expect(normalizeLocation(undefined)).toBe('')
    expect(normalizeLocation('')).toBe('')
  })

  it('strips UK suffix variants', () => {
    expect(normalizeLocation('London, United Kingdom')).toBe('London')
    expect(normalizeLocation('Manchester, UK')).toBe('Manchester')
    expect(normalizeLocation('Edinburgh, Scotland')).toBe('Edinburgh')
    expect(normalizeLocation('Bristol, England')).toBe('Bristol')
    expect(normalizeLocation('Cardiff, Wales')).toBe('Cardiff')
    expect(normalizeLocation('Belfast (UK)')).toBe('Belfast')
  })

  it('remaps remote aliases', () => {
    expect(normalizeLocation('remote')).toBe('Remote')
    expect(normalizeLocation('Anywhere')).toBe('Remote')
    expect(normalizeLocation('WORLDWIDE')).toBe('Remote')
    expect(normalizeLocation('global')).toBe('Remote')
  })

  it('remaps UK country aliases', () => {
    expect(normalizeLocation('uk')).toBe('United Kingdom')
    expect(normalizeLocation('GB')).toBe('United Kingdom')
    expect(normalizeLocation('great britain')).toBe('United Kingdom')
  })

  it('preserves non-UK city names unchanged', () => {
    expect(normalizeLocation('Berlin')).toBe('Berlin')
    expect(normalizeLocation('New York')).toBe('New York')
    expect(normalizeLocation('Amsterdam')).toBe('Amsterdam')
  })

  it('trims whitespace', () => {
    expect(normalizeLocation('  London  ')).toBe('London')
  })
})

describe('normalizeLocations', () => {
  it('deduplicates case-insensitively and sorts', () => {
    const result = normalizeLocations(['London', 'london', 'Manchester', null, '', 'Berlin'])
    expect(result).toEqual(['Berlin', 'London', 'Manchester'])
  })

  it('normalizes each location', () => {
    const result = normalizeLocations(['London, UK', 'remote', 'Anywhere'])
    expect(result).toEqual(['London', 'Remote'])
  })
})
