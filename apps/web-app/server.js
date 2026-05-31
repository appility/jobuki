import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import express from 'express'
import compression from 'compression'
import morgan from 'morgan'
import { createRequestHandler } from '@react-router/express'
import { RouterContextProvider } from 'react-router'

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'jobuki.co'
const PORT = process.env.PORT || 3000
const IS_PROD = process.env.NODE_ENV === 'production'

const app = express()

app.use(compression())
app.use(morgan(IS_PROD ? 'combined' : 'dev'))
app.use(express.static('build/client', { maxAge: IS_PROD ? '1y' : 0 }))

// ── Subdomain / custom domain resolution ─────────────────────────────
app.use((req, _res, next) => {
  const host = req.hostname

  // Local dev — no subdomain handling needed
  if (host === 'localhost' || host === '127.0.0.1') return next()

  // Root domain — marketing + admin app
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return next()

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

// ── React Router handler ──────────────────────────────────────────────
app.all(
  '*',
  createRequestHandler({
    // In dev, vite serves this. In prod, import the built server bundle.
    build: IS_PROD
      ? await import('./build/server/index.js')
      : () => import('./build/server/index.js'),

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
