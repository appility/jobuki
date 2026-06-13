import type { LoaderFunctionArgs } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const robotsTxt = `User-agent: *
Allow: /
Allow: /jobs
Allow: /jobs/category/*
Allow: /jobs/*/
Allow: /apply/*
Disallow: /admin
Disallow: /dashboard
Disallow: /candidate
Disallow: /hiring
Disallow: /sign-in
Disallow: /sign-up
Disallow: /sso-callback

Sitemap: ${url.protocol}//${url.host}/sitemap.xml
`

  return new Response(robotsTxt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
