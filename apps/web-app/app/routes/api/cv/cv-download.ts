import type { LoaderFunctionArgs } from 'react-router'
import { getDb, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../../lib/auth.server'
import { createCvDownloadUrl } from '../../../lib/r2.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'candidate' })
  const db = getDb()

  // Get the user's CV URL from their profile
  const profile = await db.query.candidateProfiles.findFirst({
    where: eq(candidateProfiles.userId, user.id),
  })

  if (!profile?.cvUrl) {
    throw new Response('No CV found', { status: 404 })
  }

  try {
    const cvUrl = profile.cvUrl

    // Get presigned download URL
    const downloadUrl = await createCvDownloadUrl(cvUrl)

    // Fetch from R2 and stream back
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Response('Failed to fetch CV', { status: response.status })
    }

    const contentType = getContentTypeFromUrl(cvUrl)
    const buffer = await response.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[cv-download] error:', error)
    throw new Response('Failed to download CV', { status: 500 })
  }
}

function getContentTypeFromUrl(url: string): string {
  if (url.endsWith('.pdf')) return 'application/pdf'
  if (url.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (url.endsWith('.doc')) return 'application/msword'
  if (url.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}
