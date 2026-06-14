import { json, type LoaderFunctionArgs } from 'react-router'
import { getDb, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { createCvUploadUrl, ALLOWED_CV_MIME_TYPES, MAX_UPLOAD_BYTES } from '../../lib/r2.server'
import { extractTextFromCv } from '../../lib/cv-extraction.server'

export async function action(args: LoaderFunctionArgs) {
  if (args.request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }

  const user = await requireUser(args, { type: 'candidate' })
  const formData = await args.request.formData()
  const cvFile = formData.get('cv') as File | null

  if (!cvFile) {
    return json({ ok: false, error: 'No CV file provided' }, { status: 400 })
  }

  const mimeType = cvFile.type
  if (!ALLOWED_CV_MIME_TYPES.includes(mimeType as any)) {
    return json(
      { ok: false, error: `Unsupported file type. Allowed: PDF, Word, TXT` },
      { status: 400 }
    )
  }

  const fileSize = cvFile.size
  if (fileSize > MAX_UPLOAD_BYTES.cv) {
    return json(
      { ok: false, error: `File too large. Max size: ${MAX_UPLOAD_BYTES.cv / 1024 / 1024}MB` },
      { status: 400 }
    )
  }

  try {
    // Get presigned URL for upload
    const uploadUrls = await createCvUploadUrl({
      userId: user.id,
      contentType: mimeType,
    })

    // Extract text from CV
    const arrayBuffer = await cvFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extractedText = await extractTextFromCv(buffer, mimeType)

    // Update candidate profile with CV URL and extracted text
    const db = getDb()
    await db.update(candidateProfiles)
      .set({
        cvUrl: uploadUrls.publicUrl,
        cvExtractedText: extractedText || null,
        updatedAt: new Date(),
      })
      .where(eq(candidateProfiles.userId, user.id))

    return json({
      ok: true,
      uploadUrl: uploadUrls.uploadUrl,
      cvUrl: uploadUrls.publicUrl,
      extractedText: extractedText || null,
    })
  } catch (error) {
    console.error('[upload-cv] error:', error)
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
