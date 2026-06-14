import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../lib/auth.server'
import { createCvDownloadUrl } from '../../lib/r2.server'
import mammoth from 'mammoth'

export async function loader(args: LoaderFunctionArgs) {
  // This endpoint is called from board owners viewing applications
  // They already have workspace access verified
  await requireWorkspaceAccess(args)

  const url = new URL(args.request.url)
  const cvUrl = url.searchParams.get('url')

  if (!cvUrl) {
    throw new Response('No CV URL provided', { status: 400 })
  }

  try {
    // Get presigned download URL
    const downloadUrl = await createCvDownloadUrl(cvUrl)

    // Fetch from R2
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Response('Failed to fetch CV', { status: response.status })
    }

    const buffer = await response.arrayBuffer()
    const contentType = getContentTypeFromUrl(cvUrl)

    // Handle based on file type
    if (cvUrl.endsWith('.pdf')) {
      // For PDFs, return a presigned URL that the browser can embed
      return new Response(
        JSON.stringify({
          type: 'pdf',
          pdfUrl: downloadUrl,
        }),
        { headers: { 'content-type': 'application/json' } }
      )
    } else if (cvUrl.endsWith('.docx') || cvUrl.endsWith('.doc')) {
      // Convert Word to HTML
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
        return new Response(
          JSON.stringify({
            type: 'html',
            html: result.value,
          }),
          { headers: { 'content-type': 'application/json' } }
        )
      } catch (err) {
        console.error('[cv-preview] mammoth conversion error:', err)
        // Fallback: return text extraction
        const text = await mammoth.extractRawText({ arrayBuffer: buffer })
        return new Response(
          JSON.stringify({
            type: 'text',
            text: text.value,
          }),
          { headers: { 'content-type': 'application/json' } }
        )
      }
    } else if (cvUrl.endsWith('.txt')) {
      // Plain text
      const text = new TextDecoder().decode(buffer)
      return new Response(
        JSON.stringify({
          type: 'text',
          text,
        }),
        { headers: { 'content-type': 'application/json' } }
      )
    } else {
      throw new Response('Unsupported file type', { status: 400 })
    }
  } catch (error) {
    console.error('[cv-preview] error:', error)
    throw new Response('Failed to preview CV', { status: 500 })
  }
}

function getContentTypeFromUrl(url: string): string {
  if (url.endsWith('.pdf')) return 'application/pdf'
  if (url.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (url.endsWith('.doc')) return 'application/msword'
  if (url.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}
