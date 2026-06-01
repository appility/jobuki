import type { ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../lib/auth.server'
import { ALLOWED_IMAGE_MIME_TYPES, createBoardAssetUploadUrl, MAX_UPLOAD_BYTES } from '../../lib/r2.server'

export async function action(args: ActionFunctionArgs) {
  try {
    const { workspace } = await requireWorkspaceAccess(args)
    const form = await args.request.formData()

    const boardId = String(form.get('boardId') ?? '').trim()
    const kind = form.get('kind')
    const contentType = String(form.get('contentType') ?? '').trim().toLowerCase()
    const size = Number(form.get('size') ?? 0)

    if (!boardId) {
      return Response.json({ ok: false, error: 'Missing board id.' }, { status: 400 })
    }

    await requireBoardInWorkspace(boardId, workspace.id)

    if (kind !== 'logo' && kind !== 'header') {
      return Response.json({ ok: false, error: 'Invalid upload kind.' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(contentType as any)) {
      return Response.json(
        {
          ok: false,
          error: `Unsupported image type. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES[kind]) {
      return Response.json(
        {
          ok: false,
          error: `Image is too large. ${kind === 'logo' ? 'Logo' : 'Header'} max size is ${Math.floor(MAX_UPLOAD_BYTES[kind] / (1024 * 1024))}MB.`,
        },
        { status: 400 }
      )
    }

    const signed = await createBoardAssetUploadUrl({
      boardId,
      kind,
      contentType,
    })

    return Response.json({ ok: true, ...signed })
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
        error: error?.message ?? 'Unable to create upload URL.',
      },
      { status: 500 }
    )
  }
}
