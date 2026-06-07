import OpenAI from 'openai'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      project: process.env.OPENAI_PROJECT_ID,
    })
  }
  return client
}

// Returns an error string if flagged, null if clean.
export async function checkImageModeration(imageBytes: Uint8Array, contentType: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null // skip if not configured

  try {
    const base64 = Buffer.from(imageBytes).toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    const result = await getClient().moderations.create({
      model: 'omni-moderation-latest',
      input: [{ type: 'image_url', image_url: { url: dataUrl } }],
    })

    const flagged = result.results[0]
    if (!flagged) return null

    if (flagged.flagged) {
      const categories = flagged.categories as unknown as Record<string, boolean>
      if (categories['sexual'] || categories['sexual/minors']) {
        return 'This image contains explicit sexual content and cannot be uploaded.'
      }
      if (categories['violence'] || categories['violence/graphic']) {
        return 'This image contains violent content and cannot be uploaded.'
      }
      return 'This image was flagged as inappropriate and cannot be uploaded.'
    }

    return null
  } catch (err: any) {
    // Fail open — don't block uploads if moderation is unavailable
    console.error('[moderation] OpenAI check failed:', err?.message ?? err)
    return null
  }
}
