import { getDb, geoRegions } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { cacheGet, cacheSet } from './board-cache.server'

export interface GeoRegion {
  slug: string
  label: string
  flag: string | null
  cfCountryCodes: string[]
  locationKeywords: string[]
  sourceKeys: string[]
  sortOrder: number
}

const REGIONS_CACHE_KEY = 'geo:regions'
const REGIONS_TTL = 10 * 60 * 1000 // 10 minutes

export async function getGeoRegions(): Promise<GeoRegion[]> {
  const cached = cacheGet<GeoRegion[]>(REGIONS_CACHE_KEY)
  if (cached) return cached

  const db = getDb()
  let rows: typeof geoRegions.$inferSelect[] = []
  try {
    rows = await db
      .select()
      .from(geoRegions)
      .where(eq(geoRegions.enabled, true))
      .orderBy(geoRegions.sortOrder)
  } catch (err: any) {
    // Table doesn't exist yet (migration pending) — degrade gracefully
    if (err?.code === '42P01') return []
    throw err
  }

  const regions: GeoRegion[] = rows.map(r => ({
    slug: r.slug,
    label: r.label,
    flag: r.flag,
    sortOrder: r.sortOrder,
    cfCountryCodes: r.cfCountryCodes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
    locationKeywords: r.locationKeywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    sourceKeys: r.sourceKeys.split(',').map(s => s.trim()).filter(Boolean),
  }))

  cacheSet(REGIONS_CACHE_KEY, regions, REGIONS_TTL)
  return regions
}

export function visitorRegion(request: Request, regions: GeoRegion[]): GeoRegion | null {
  // Cloudflare sets CF-IPCountry; Railway preserves it
  const cfCountry = request.headers.get('cf-ipcountry')?.toUpperCase()
  if (!cfCountry || cfCountry === 'XX') return null
  return regions.find(r => r.cfCountryCodes.includes(cfCountry)) ?? null
}

export function scoreJob(
  job: { location: string | null; externalSource: string | null; remotePolicy: string },
  visitorRegion: GeoRegion | null,
  regions: GeoRegion[]
): number {
  const loc = (job.location ?? '').toLowerCase()
  const src = job.externalSource ?? ''
  const isRemote = job.remotePolicy === 'remote'

  // Find which region this job belongs to
  let jobRegion: GeoRegion | null = null
  for (const region of regions) {
    const locMatch = region.locationKeywords.some(kw => loc.includes(kw))
    const srcMatch = region.sourceKeys.includes(src)
    const remoteMatch = region.slug === 'remote' && isRemote
    if (locMatch || srcMatch || remoteMatch) {
      jobRegion = region
      break
    }
  }

  if (!jobRegion) return 1 // unknown region — base score

  if (!visitorRegion) {
    // No geo data — prefer English sources (gb first, then remote)
    if (jobRegion.slug === 'gb') return 3
    if (jobRegion.slug === 'remote') return 2
    return 1
  }

  if (jobRegion.slug === visitorRegion.slug) return 4  // exact region match
  if (jobRegion.slug === 'remote') return 3            // remote is always relevant
  if (jobRegion.slug === 'gb' && visitorRegion.slug === 'us') return 2  // English cross-appeal
  return 1
}

export function rankJobs<T extends { location: string | null; externalSource: string | null; remotePolicy: string }>(
  jobs: T[],
  visitorReg: GeoRegion | null,
  regions: GeoRegion[]
): T[] {
  // Stable sort: highest score first, preserve createdAt order within same score
  return [...jobs].sort((a, b) => {
    const sa = scoreJob(a, visitorReg, regions)
    const sb = scoreJob(b, visitorReg, regions)
    return sb - sa
  })
}
