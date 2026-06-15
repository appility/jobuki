import type { LoaderFunctionArgs } from 'react-router'
import { requirePlatformAdminApi } from '../../../lib/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requirePlatformAdminApi(request)

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
    },
  })
}
