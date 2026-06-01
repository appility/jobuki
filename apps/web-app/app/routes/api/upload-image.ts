import type { ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../lib/auth.server'
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES, uploadBoardAsset } from '../../lib/r2.server'

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
    const uploaded = await uploadBoardAsset({
      boardId,
      kind,
      contentType,
      body: buffer,
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
