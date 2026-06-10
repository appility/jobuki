/**
 * Seed the geo_regions table with initial GB / US / Remote entries.
 * Run once after migrating: node packages/db/scripts/seed-geo-regions.mjs
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { geoRegions } from '../src/schema.ts'

const client = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL)
const db = drizzle(client)

const REGIONS = [
  {
    slug: 'gb',
    label: 'United Kingdom',
    flag: '🇬🇧',
    // Cloudflare CF-IPCountry codes
    cfCountryCodes: 'GB,IE',
    // Substrings matched (case-insensitive) against the job's location field
    locationKeywords: 'united kingdom,uk,england,scotland,wales,northern ireland,london,manchester,birmingham,leeds,glasgow,edinburgh,liverpool,bristol,sheffield,cambridge,oxford',
    // externalSource values that primarily feed UK jobs
    sourceKeys: 'reed_json,adzuna_json,govuk_atom',
    sortOrder: 1,
  },
  {
    slug: 'us',
    label: 'United States',
    flag: '🇺🇸',
    cfCountryCodes: 'US',
    locationKeywords: 'united states,usa,u.s.,new york,san francisco,los angeles,chicago,austin,seattle,boston,denver,miami,washington',
    sourceKeys: '',
    sortOrder: 2,
  },
  {
    slug: 'remote',
    label: 'Remote',
    flag: '🌍',
    cfCountryCodes: '',
    locationKeywords: 'remote,anywhere,worldwide,global,distributed',
    sourceKeys: 'remotive,arbeitnow,himalayas,weworkremotely,working_nomads,remoteok,jobicy',
    sortOrder: 3,
  },
]

for (const region of REGIONS) {
  await db
    .insert(geoRegions)
    .values(region)
    .onConflictDoUpdate({
      target: geoRegions.slug,
      set: {
        label:            region.label,
        flag:             region.flag,
        cfCountryCodes:   region.cfCountryCodes,
        locationKeywords: region.locationKeywords,
        sourceKeys:       region.sourceKeys,
        sortOrder:        region.sortOrder,
      },
    })
  console.log(`✓ ${region.flag}  ${region.label} (${region.slug})`)
}

await client.end()
console.log('\nDone.')
