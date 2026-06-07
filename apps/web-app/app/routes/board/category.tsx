import { redirect } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const category = params.category ?? ''

  if (!category) {
    return redirect('/jobs')
  }

  const target = new URL('/jobs', url)
  target.searchParams.set('category', category)

  const q = (url.searchParams.get('q') ?? '').trim()
  const location = (url.searchParams.get('location') ?? '').trim()

  if (q) target.searchParams.set('q', q)
  if (location) target.searchParams.set('location', location)

  return redirect(`${target.pathname}${target.search}`)
}

export default function BoardCategoryRedirect() {
  return null
}
