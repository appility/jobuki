import { config } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const appRoot = dirname(fileURLToPath(import.meta.url))

config({ path: join(appRoot, '.env') })
config({ path: join(appRoot, '.env.local'), override: true })

import express from 'express'
import compression from 'compression'
import morgan from 'morgan'
import { createRequestHandler } from '@react-router/express'
import { RouterContextProvider } from 'react-router'

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'jobuki.co'
const APP_PUBLIC_HOSTS = (process.env.APP_PUBLIC_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean)
const PORT = process.env.PORT || 3000
const IS_PROD = process.env.NODE_ENV === 'production'

const app = express()

app.use(compression())
app.use(morgan(IS_PROD ? 'combined' : 'dev'))
app.use(express.static(join(appRoot, 'build/client'), {
  maxAge: IS_PROD ? '1y' : 0,
  immutable: IS_PROD,
}))

// ── Subdomain / custom domain resolution ─────────────────────────────
app.use((req, _res, next) => {
  const host = req.hostname.toLowerCase()

  // Local dev — no subdomain handling needed
  if (host === 'localhost' || host === '127.0.0.1') return next()

  // Root domain — marketing + admin app
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return next()

  // Railway default domains and optional extra app hosts should behave like root app.
  // This prevents default deploy URLs (e.g. *.up.railway.app) from being treated as board domains.
  if (host.endsWith('.up.railway.app') || APP_PUBLIC_HOSTS.includes(host)) return next()

  // Jobuki subdomain: acme.jobuki.co
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.replace(`.${ROOT_DOMAIN}`, '')
    req.headers['x-board-slug'] = slug
    req.headers['x-board-type'] = 'subdomain'
    return next()
  }

  // Custom domain: jobs.acme.com
  req.headers['x-board-hostname'] = host
  req.headers['x-board-type'] = 'custom'
  next()
})

// ── Clerk handshake on .data URLs ────────────────────────────────────
// React Router Single Fetch appends .data to route URLs for client-side nav.
// If Clerk captures one of these as the redirect target, strip .data before
// processing the handshake so the user lands on the real page, not raw JSON.
app.use((req, res, next) => {
  if (req.path.endsWith('.data') && req.query.__clerk_handshake) {
    const cleanPath = req.path.replace(/\.data$/, '')
    const search = new URLSearchParams(req.query).toString()
    return res.redirect(302, `${cleanPath}?${search}`)
  }
  next()
})

// ── React Router handler ──────────────────────────────────────────────
app.all(
  '*',
  createRequestHandler({
    // In dev, vite serves this. In prod, import the built server bundle.
    build: IS_PROD
      ? await import(pathToFileURL(join(appRoot, 'build/server/index.js')).href)
      : () => import(pathToFileURL(join(appRoot, 'build/server/index.js')).href),

    getLoadContext() {
      // v8_middleware requires a RouterContextProvider.
      // Board slug/hostname/type are passed as request headers by the
      // subdomain middleware above and read directly in loaders via request.headers.
      return new RouterContextProvider()
    },
  })
)

app.listen(PORT, () => {
  console.log(`▶  Jobuki running on http://localhost:${PORT}`)
})
