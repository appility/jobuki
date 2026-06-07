import type { ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../lib/auth.server'
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES, uploadBoardAsset } from '../../lib/r2.server'
import sharp from 'sharp'
import { checkImageModeration } from '../../lib/image-moderation.server'

const WEBP_QUALITY = 82

async function optimizeUploadImage(params: {
  kind: 'logo' | 'header'
  contentType: string
  bytes: Uint8Array
}) {
  const { kind, contentType, bytes } = params

  // Keep SVG as-is to avoid rasterizing vector assets unexpectedly.
  if (contentType === 'image/svg+xml') {
    return { body: bytes, contentType }
  }

  if (contentType === 'image/png' || contentType === 'image/jpeg' || contentType === 'image/webp') {
    const maxWidth = kind === 'logo' ? 1200 : 2400
    const maxHeight = kind === 'logo' ? 1200 : 1600

    const transformed = await sharp(Buffer.from(bytes))
      .rotate()
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

    return {
      body: new Uint8Array(transformed),
      contentType: 'image/webp',
    }
  }

  return { body: bytes, contentType }
}

export async function action(args: ActionFunctionArgs) {
  try {
    const { workspace } = await requireWorkspaceAccess(args)
    const form = await args.request.formData()

    const boardId = String(form.get('boardId') ?? '').trim()
    const kind = String(form.get('kind') ?? '').trim()
    const file = form.get('file')

    if (!boardId) {
      return Response.json({ ok: false, error: 'Missing board id.' }, { status: 400 })
    }

    await requireBoardInWorkspace(boardId, workspace.id)

    if (kind !== 'logo' && kind !== 'header') {
      return Response.json({ ok: false, error: 'Invalid upload kind.' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: 'Missing image file.' }, { status: 400 })
    }

    const contentType = (file.type || '').trim().toLowerCase()
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(contentType as any)) {
      return Response.json(
        {
          ok: false,
          error: `Unsupported image type. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const maxBytes = MAX_UPLOAD_BYTES[kind]
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes) {
      return Response.json(
        {
          ok: false,
          error: `Image is too large. ${kind === 'logo' ? 'Logo' : 'Header'} max size is ${Math.floor(maxBytes / (1024 * 1024))}MB.`,
        },
        { status: 400 }
      )
    }

    const buffer = new Uint8Array(await file.arrayBuffer())

    const moderationError = await checkImageModeration(buffer, contentType)
    if (moderationError) {
      return Response.json({ ok: false, error: moderationError }, { status: 400 })
    }

    const optimized = await optimizeUploadImage({
      kind,
      contentType,
      bytes: buffer,
    })
    const uploaded = await uploadBoardAsset({
      boardId,
      kind,
      contentType: optimized.contentType,
      body: optimized.body,
    })

    return Response.json({ ok: true, ...uploaded })
  } catch (error: any) {
    if (error instanceof Response) {
      if (error.status === 404) {
        return Response.json({ ok: false, error: 'Board not found.' }, { status: 404 })
      }
      if (error.status === 401 || error.status === 302) {
        return Response.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
      }
    }

    return Response.json(
      {
        ok: false,
        error: error?.message ?? 'Unable to upload image.',
      },
      { status: 500 }
    )
  }
}
