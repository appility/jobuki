import type { LoaderFunctionArgs } from 'react-router'

export async function loader(_args: LoaderFunctionArgs) {
  return new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
