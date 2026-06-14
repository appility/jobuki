import type { LoaderFunctionArgs } from 'react-router'
import { getDb, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { createCvUploadUrl, ALLOWED_CV_MIME_TYPES, MAX_UPLOAD_BYTES } from '../../lib/r2.server'
import { extractTextFromCv } from '../../lib/cv-extraction.server'

const jsonResponse = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json' }
})

export async function action(args: LoaderFunctionArgs) {
  if (args.request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const user = await requireUser(args, { type: 'candidate' })
  const formData = await args.request.formData()
  const cvFile = formData.get('cv') as File | null

  if (!cvFile) {
    return jsonResponse({ ok: false, error: 'No CV file provided' }, 400)
  }

  const mimeType = cvFile.type
  if (!ALLOWED_CV_MIME_TYPES.includes(mimeType as any)) {
    return jsonResponse(
      { ok: false, error: `Unsupported file type. Allowed: PDF, Word, TXT` },
      400
    )
  }

  const fileSize = cvFile.size
  if (fileSize > MAX_UPLOAD_BYTES.cv) {
    return jsonResponse(
      { ok: false, error: `File too large. Max size: ${MAX_UPLOAD_BYTES.cv / 1024 / 1024}MB` },
      400
    )
  }

  try {
    // Extract text from CV
    const arrayBuffer = await cvFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extractedText = await extractTextFromCv(buffer, mimeType)

    // Get presigned URL and upload details
    const uploadUrls = await createCvUploadUrl({
      userId: user.id,
      contentType: mimeType,
    })

    // Upload file to R2 using presigned URL
    const uploadResponse = await fetch(uploadUrls.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: new Uint8Array(buffer),
    })

    if (!uploadResponse.ok) {
      console.error('[upload-cv] R2 upload failed:', uploadResponse.statusText)
      return jsonResponse(
        { ok: false, error: 'Failed to store file. Please try again.' },
        500
      )
    }

    // Update candidate profile with CV URL and extracted text
    const db = getDb()
    await db.update(candidateProfiles)
      .set({
        cvUrl: uploadUrls.publicUrl,
        cvExtractedText: extractedText || null,
        updatedAt: new Date(),
      })
      .where(eq(candidateProfiles.userId, user.id))

    return jsonResponse({
      ok: true,
      cvUrl: uploadUrls.publicUrl,
      extractedText: extractedText || null,
    })
  } catch (error) {
    console.error('[upload-cv] error:', error)
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : 'Upload failed' },
      500
    )
  }
}
