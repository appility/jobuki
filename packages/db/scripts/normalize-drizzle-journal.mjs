import fs from 'node:fs/promises'
import path from 'node:path'

const journalPath = path.resolve(process.cwd(), 'migrations/meta/_journal.json')

const DAY_MS = 24 * 60 * 60 * 1000
const BASE_WHEN = 1780182143791

async function main() {
  const raw = await fs.readFile(journalPath, 'utf8')
  const journal = JSON.parse(raw)

  if (!Array.isArray(journal.entries)) {
    throw new Error('Invalid drizzle journal format: entries array missing')
  }

  const normalizedEntries = [...journal.entries]
    .sort((left, right) => left.idx - right.idx)
    .map((entry, index) => ({
      ...entry,
      when: BASE_WHEN + index * DAY_MS,
    }))

  const nextJournal = {
    ...journal,
    entries: normalizedEntries,
  }

  await fs.writeFile(journalPath, `${JSON.stringify(nextJournal, null, 2)}\n`)
  console.log(`Normalized Drizzle journal timestamps in ${journalPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})