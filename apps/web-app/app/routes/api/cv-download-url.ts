import type { LoaderFunctionArgs } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { createCvDownloadUrl } from '../../lib/r2.server'

const jsonResponse = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json' }
})

export async function action(args: LoaderFunctionArgs) {
  if (args.request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  await requireUser(args, { type: 'candidate' })

  try {
    const { cvUrl } = await args.request.json()

    if (!cvUrl) {
      return jsonResponse({ error: 'CV URL required' }, 400)
    }

    // Validate it's an R2 URL (prevent open redirect)
    const url = new URL(cvUrl)
    if (!url.hostname.includes('r2.dev')) {
      return jsonResponse({ error: 'Invalid CV URL' }, 400)
    }

    const downloadUrl = await createCvDownloadUrl(cvUrl)
    const contentType = getContentTypeFromUrl(cvUrl)

    return jsonResponse({
      ok: true,
      downloadUrl,
      contentType,
    })
  } catch (error) {
    console.error('[cv-download-url] error:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Failed to generate download URL' },
      500
    )
  }
}

function getContentTypeFromUrl(url: string): string {
  if (url.endsWith('.pdf')) return 'application/pdf'
  if (url.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (url.endsWith('.doc')) return 'application/msword'
  if (url.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}
