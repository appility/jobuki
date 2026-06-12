# Jobuki — Monorepo

Branded job board builder. "Your jobs. Your brand. Your board."

## Stack

- **React Router 7** — SSR framework
- **Express** — custom server, handles subdomain routing
- **Drizzle + Supabase** — database
- **Clerk** — admin auth
- **Tailwind + CSS variables** — theming system
- **Railway + Cloudflare** — deployment

## Structure

```
jobuki/
├── apps/
│   └── web-app/                # Main React Router 7 app
│       ├── server.js           # Express server (subdomain middleware)
│       ├── app/
│       │   ├── routes/
│       │   │   ├── marketing/  # jobuki.co
│       │   │   ├── admin/      # jobuki.co/dashboard (Clerk protected)
│       │   │   └── board/      # acme.jobuki.co (public boards)
│       │   ├── lib/
│       │   │   └── theme.ts    # BoardTheme → CSS variables
│       │   └── styles/
│       │       └── globals.css # Token definitions + component classes
│       └── tailwind.config.ts  # Tailwind wired to CSS variables
├── packages/
│   ├── db/                     # Drizzle schema + client
│   └── types/                  # Shared TypeScript types + DEFAULT_THEME
└── pnpm-workspace.yaml
```

## How the theming system works

Every public board page injects a `<style>` tag via `board/layout.tsx`:

```tsx
// board/layout.tsx
const css = themeToCSS(board.theme)  // BoardTheme → CSS var string
<style dangerouslySetInnerHTML={{ __html: css }} />
```

All Tailwind classes on public board components reference CSS variables:
```tsx
// bg-primary = background-color: var(--color-primary)
// rounded-lg = border-radius: var(--radius-lg)  ← overrideable per board
<button className="btn-primary rounded-lg">Apply</button>
```

So changing a board's theme in the appearance panel instantly changes every
visual token on their public board — no separate deployments needed.

## Subdomain routing

```
acme.jobuki.co      → Express reads host → sets x-board-slug: acme
jobs.acme.com       → Express reads host → sets x-board-hostname: jobs.acme.com
```

Handled entirely in `server.js` — no Next.js middleware, no Cloudflare Workers.

## Local dev

```bash
pnpm install
cp apps/web-app/.env.example apps/web-app/.env  # fill in values
pnpm dev
```

For subdomain testing, add to `/etc/hosts`:
```
127.0.0.1 acme.localhost
127.0.0.1 remote-first.localhost
```

Then hit `http://acme.localhost:3000`

## Deploy to Railway

1. Push to GitHub
2. Create Railway project → connect repo
3. Set env vars (DATABASE_URL, CLERK keys, ROOT_DOMAIN)
4. Add `railway.json` build config (already included)
5. Point `*.jobuki.co` DNS to Railway via Cloudflare (proxy on, wildcard cert)



<!-- sh -c 'curl -fsS -X POST -H "Authorization: Bearer $INGEST_SECRET" -H "Content-Type: application/json" -d "{\"source\":\"all\",\"limit\":500}" "http://$APP_INTERNAL_HOST/api/ingest-jobs" && echo Done' -->

jobukiweb-app.railway.internal

sh -c 'curl -fsS -X POST -H "Authorization: Bearer $INGEST_SECRET" -H "Content-Type: application/json" -d "{\"source\":\"all\",\"limit\":500}" "http://$APP_INTERNAL_HOST/api/ingest-jobs" && echo Done'


<!-- 0 */6 * * * -->