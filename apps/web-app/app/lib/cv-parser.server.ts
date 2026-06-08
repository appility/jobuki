export async function parseCvFromUrl(url: string): Promise<string | null> {
  if (!url?.trim()) return null

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JobukiBot/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    const bytes = Buffer.from(await res.arrayBuffer())

    if (contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
      const { default: pdfParse } = await import('pdf-parse')
      const parsed = await pdfParse(bytes)
      return parsed.text?.slice(0, 6000) || null
    }

    // Plain text or HTML — just take the raw text
    const text = bytes.toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return text.slice(0, 6000) || null
  } catch {
    return null
  }
}
