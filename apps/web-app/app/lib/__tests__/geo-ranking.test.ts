import { describe, it, expect } from 'vitest'
import { scoreJob, rankJobs, visitorRegion } from '../geo-ranking.server'
import type { GeoRegion } from '../geo-ranking.server'

const GB: GeoRegion = {
  slug: 'gb', label: 'United Kingdom', flag: '🇬🇧', sortOrder: 0,
  cfCountryCodes: ['GB', 'IE'],
  locationKeywords: ['london', 'manchester', 'united kingdom', 'uk'],
  sourceKeys: ['reed.co.uk', 'findajob.dwp.gov.uk'],
}

const US: GeoRegion = {
  slug: 'us', label: 'United States', flag: '🇺🇸', sortOrder: 1,
  cfCountryCodes: ['US'],
  locationKeywords: ['new york', 'san francisco', 'united states'],
  sourceKeys: [],
}

const REMOTE: GeoRegion = {
  slug: 'remote', label: 'Remote', flag: null, sortOrder: 2,
  cfCountryCodes: [],
  locationKeywords: ['remote', 'worldwide'],
  sourceKeys: ['remoteok.com', 'weworkremotely.com'],
}

const REGIONS = [GB, US, REMOTE]

const job = (overrides: Partial<{ location: string | null; externalSource: string | null; remotePolicy: string }>) => ({
  location: null,
  externalSource: null,
  remotePolicy: 'onsite',
  ...overrides,
})

describe('scoreJob', () => {
  it('returns 4 for exact region match', () => {
    expect(scoreJob(job({ location: 'London' }), GB, REGIONS)).toBe(4)
  })

  it('returns 3 for remote job regardless of visitor', () => {
    expect(scoreJob(job({ remotePolicy: 'remote', externalSource: 'remoteok.com' }), US, REGIONS)).toBe(3)
  })

  it('returns 3 for GB job with no visitor region', () => {
    expect(scoreJob(job({ location: 'London' }), null, REGIONS)).toBe(3)
  })

  it('returns 2 for remote job with no visitor region', () => {
    expect(scoreJob(job({ remotePolicy: 'remote', externalSource: 'remoteok.com' }), null, REGIONS)).toBe(2)
  })

  it('returns 2 for GB job when visitor is US', () => {
    expect(scoreJob(job({ location: 'London' }), US, REGIONS)).toBe(2)
  })

  it('returns 1 for unknown region job', () => {
    expect(scoreJob(job({ location: 'Tokyo' }), GB, REGIONS)).toBe(1)
  })

  it('matches by externalSource', () => {
    expect(scoreJob(job({ externalSource: 'reed.co.uk' }), GB, REGIONS)).toBe(4)
  })
})

describe('rankJobs', () => {
  it('sorts highest score first', () => {
    const jobs = [
      job({ location: 'New York', remotePolicy: 'onsite' }),       // US → score 1 for GB visitor
      job({ location: 'London', remotePolicy: 'onsite' }),         // GB → score 4
      job({ remotePolicy: 'remote', externalSource: 'remoteok.com' }), // remote → score 3
    ]
    const ranked = rankJobs(jobs, GB, REGIONS)
    expect(ranked[0].location).toBe('London')
    expect(ranked[1].remotePolicy).toBe('remote')
    expect(ranked[2].location).toBe('New York')
  })

  it('preserves original order for equal scores', () => {
    const jobs = [
      job({ location: 'London', remotePolicy: 'onsite' }),
      job({ location: 'Manchester', remotePolicy: 'onsite' }),
    ]
    const ranked = rankJobs(jobs, GB, REGIONS)
    expect(ranked[0].location).toBe('London')
    expect(ranked[1].location).toBe('Manchester')
  })
})

describe('visitorRegion', () => {
  const makeRequest = (cfCountry: string | null) =>
    new Request('http://localhost/', {
      headers: cfCountry ? { 'cf-ipcountry': cfCountry } : {},
    })

  it('returns matching region for known country code', () => {
    expect(visitorRegion(makeRequest('GB'), REGIONS)?.slug).toBe('gb')
    expect(visitorRegion(makeRequest('IE'), REGIONS)?.slug).toBe('gb')
    expect(visitorRegion(makeRequest('US'), REGIONS)?.slug).toBe('us')
  })

  it('returns null for unknown country code', () => {
    expect(visitorRegion(makeRequest('JP'), REGIONS)).toBeNull()
  })

  it('returns null for XX (Cloudflare unknown)', () => {
    expect(visitorRegion(makeRequest('XX'), REGIONS)).toBeNull()
  })

  it('returns null when no header', () => {
    expect(visitorRegion(makeRequest(null), REGIONS)).toBeNull()
  })
})
