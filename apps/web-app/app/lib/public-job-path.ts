function slugifySegment(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function jobTitleSlug(title: string) {
  return encodeURIComponent(slugifySegment(title) || 'role')
}

export function publicJobPath(job: { id: string; title: string }) {
  return `/jobs/${job.id}/${jobTitleSlug(job.title)}`
}