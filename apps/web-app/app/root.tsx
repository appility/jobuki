import {
  Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData,
} from 'react-router'
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { ClerkProvider } from '@clerk/react-router'
import { rootAuthLoader, clerkMiddleware } from '@clerk/react-router/server'
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
  const authData = await rootAuthLoader(args)
  const boardSlug = args.request.headers.get('x-board-slug')
  const boardHostname = args.request.headers.get('x-board-hostname')

  return {
    ...authData,
    isPublicBoardRequest: Boolean(boardSlug || boardHostname),
  }
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

  if (loaderData.isPublicBoardRequest) {
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
