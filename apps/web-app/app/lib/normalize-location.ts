const STRIP_SUFFIXES = [
  ', United Kingdom',
  ', UK',
  ', England',
  ', Scotland',
  ', Wales',
  ', Northern Ireland',
  ', Great Britain',
  ' (UK)',
  ' (United Kingdom)',
]

const EXACT_REMAP: Record<string, string> = {
  'united kingdom': 'United Kingdom',
  'uk': 'United Kingdom',
  'gb': 'United Kingdom',
  'great britain': 'United Kingdom',
  'england': 'England',
  'scotland': 'Scotland',
  'wales': 'Wales',
  'northern ireland': 'Northern Ireland',
  'remote': 'Remote',
  'anywhere': 'Remote',
  'worldwide': 'Remote',
  'global': 'Remote',
}

export function normalizeLocation(raw: string | null | undefined): string {
  if (!raw) return ''
  let s = raw.trim()
  for (const suffix of STRIP_SUFFIXES) {
    if (s.toLowerCase().endsWith(suffix.toLowerCase())) {
      s = s.slice(0, s.length - suffix.length).trim()
    }
  }
  // Trailing comma left after strip
  s = s.replace(/,\s*$/, '').trim()
  const remapped = EXACT_REMAP[s.toLowerCase()]
  if (remapped) return remapped
  return s
}

export function normalizeLocations(raws: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of raws) {
    const n = normalizeLocation(raw)
    if (!n) continue
    const key = n.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(n)
    }
  }
  return out.sort()
}
