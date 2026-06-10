import {
  Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useLoaderData, useRouteError, useLocation,
} from 'react-router'
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { ClerkProvider } from '@clerk/react-router'
import { rootAuthLoader, clerkMiddleware } from '@clerk/react-router/server'

// Routes that need Clerk auth. Public board routes (/jobs, /, /about etc.) don't.
const AUTH_PREFIXES = ['/dashboard', '/candidate', '/hiring', '/posters', '/sign-in', '/sign-up', '/sso-callback', '/admin']
function needsAuth(pathname: string) {
  return AUTH_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}
import stylesheet from './styles/globals.css?url'

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  },
  { rel: 'stylesheet', href: stylesheet },
]

export const middleware = [clerkMiddleware()]

export async function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args)
}

export const meta: MetaFunction = () => [
  { title: 'Jobuki' },
  { name: 'description', content: 'Create and manage branded job boards.' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const loaderData = useLoaderData<typeof loader>()
  const { pathname } = useLocation()

  if (!needsAuth(pathname)) {
    return <Outlet />
  }

  return (
    <ClerkProvider
      loaderData={loaderData}
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
    >
      <Outlet />
    </ClerkProvider>
  )
}

function getErrorMessage(error: unknown) {
  if (!error) return 'Something went wrong while loading this page.'
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === 'string' && error.data.trim()) return error.data
    return `${error.status} ${error.statusText || 'Request failed'}`
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong while loading this page.'
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n')
}

function cleanErrorMessage(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return 'Something went wrong while loading this page.'

  const looksLikeHtmlDump = /<!doctype html>|<html[\s>]/i.test(trimmed)
  if (!looksLikeHtmlDump) return trimmed

  const preMatch = trimmed.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
  if (preMatch?.[1]) {
    return decodeHtmlEntities(preMatch[1]).replace(/\n{3,}/g, '\n\n').trim()
  }

  const titleMatch = trimmed.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1]).trim()
  }

  return 'A server error occurred while loading this page.'
}

function summarizeError(message: string) {
  const firstLine = message.split('\n').find((line) => line.trim())?.trim() ?? message
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine
}

function isSchemaMismatchError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes('column') &&
    lower.includes('does not exist')
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  const message = cleanErrorMessage(getErrorMessage(error))
  const schemaMismatch = isSchemaMismatchError(message)
  const summary = summarizeError(message)

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-body)' }}>
      <div className="max-w-xl w-full rounded-2xl border p-8" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <p className="text-xs font-semibold tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
          UNEXPECTED ERROR
        </p>
        <h1 className="text-2xl font-extrabold mb-3" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          We hit a problem loading this page
        </h1>

        <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
          {schemaMismatch
            ? 'The app code is newer than the database schema. A migration likely needs to be applied.'
            : 'Please refresh the page or try again in a moment.'}
        </p>

        <div className="rounded-xl border p-3 mb-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Error summary
          </p>
          <p className="text-sm break-words" style={{ color: 'var(--color-text-primary)' }}>
            {summary}
          </p>

          <details className="mt-2">
            <summary className="text-xs font-semibold cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
              View technical details
            </summary>
            <pre
              className="mt-2 text-xs whitespace-pre-wrap break-words"
              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
            >
              {message}
            </pre>
          </details>
        </div>

        {schemaMismatch && (
          <div className="rounded-xl border p-3 mb-5" style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-warning)' }}>
              Suggested fix
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Run your pending database migrations for this environment, then redeploy.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <a href="/" className="btn-primary">Go to homepage</a>
          <a href="/dashboard" className="btn-outline">Open dashboard</a>
        </div>
      </div>
    </div>
  )
}
