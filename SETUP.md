# Jobuki — Setup & Run Guide

## Prerequisites

- Node.js 20+
- pnpm 9+ — `npm install -g pnpm`
- A Supabase project (free tier is fine)
- A Clerk account (free tier is fine)

---

## 1. Extract and install

```bash
tar -xzf jobuki-scaffold.tar.gz
cd jobuki
pnpm install
```

---

## 2. Environment variables

```bash
cp apps/web-app/.env.example apps/web-app/.env
```

Open `apps/web-app/.env` and fill in:

```env
# Supabase — find this in your Supabase project under
# Settings → Database → Connection string → URI
# Use the "Transaction" pooler URL (port 6543) for serverless,
# or the direct URL (port 5432) for local dev
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Clerk — find these in Clerk dashboard → API Keys
# Must use VITE_ prefix so the publishable key is available to the browser bundle
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# Your root domain (use localhost for local dev)
ROOT_DOMAIN=jobuki.co

NODE_ENV=development
PORT=3000
```

> **Local dev tip:** Leave `ROOT_DOMAIN=jobuki.co` even locally — the
> subdomain middleware skips localhost automatically so it won't interfere.

---

## 3. Set up the database with Drizzle

### Generate migrations from the schema

```bash
cd packages/db
pnpm db:generate
```

This reads `packages/db/src/schema.ts` and generates SQL migration files
into `packages/db/migrations/`.

### Apply migrations to Supabase

```bash
pnpm db:migrate
```

This runs all pending migrations against your `DATABASE_URL`.

### Verify with Drizzle Studio (optional)

```bash
pnpm db:studio
```

Opens a browser UI at `https://local.drizzle.studio` so you can inspect
your tables and data visually.

### Re-running after schema changes

Whenever you change `packages/db/src/schema.ts`:

```bash
cd packages/db
pnpm db:generate   # generates new migration file
pnpm db:migrate    # applies it
```

> Drizzle never auto-applies — you always explicitly generate then migrate.
> The migration files are committed to git.

---

## 4. Run the dev server

From the repo root:

```bash
pnpm dev
```

This starts the Express + React Router 7 server with `--watch` (auto-restarts
on file changes) at `http://localhost:3000`.

---

## 5. Test subdomain routing locally

To test public board pages on a subdomain locally, add entries to your
hosts file:

**Mac / Linux** — edit `/etc/hosts`:
```
127.0.0.1 acme.localhost
127.0.0.1 remote-first.localhost
```

**Windows** — edit `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1 acme.localhost
127.0.0.1 remote-first.localhost
```

Then visit `http://acme.localhost:3000` — Express will read the hostname,
extract `acme` as the board slug, and route to the public board layout.

> You'll need a board with `slug = 'acme'` in your database for it to
> resolve. Use Drizzle Studio to insert one manually while building.

---

## 6. Build for production

```bash
pnpm build
```

Outputs to `apps/web-app/build/`. The Express server at `server.js` serves
the built assets directly — no separate static file server needed.

---

## 7. Deploy to Railway

### First deploy

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Railway will detect the `railway.json` config and use it automatically

### Set environment variables in Railway

In your Railway service → Variables, add:

```
DATABASE_URL        = (your Supabase connection string)
VITE_CLERK_PUBLISHABLE_KEY = pk_live_xxx
CLERK_SECRET_KEY    = sk_live_xxx
ROOT_DOMAIN         = jobuki.co
NODE_ENV            = production
PORT                = 3000
```

### Run migrations on Railway

In Railway → your service → Settings → Deploy → add a pre-deploy command:

```
cd packages/db && pnpm db:migrate
```

Or run it manually once via Railway's shell after first deploy.

### Wildcard subdomain with Cloudflare

1. In Railway → your service → Settings → Domains → add `jobuki.co`
   and note the Railway-provided URL (e.g. `jobuki-production.up.railway.app`)

2. In Cloudflare DNS for your domain, add:

   | Type  | Name | Content                              | Proxy |
   |-------|------|--------------------------------------|-------|
   | CNAME | `*`  | `jobuki-production.up.railway.app`   | ✅ On |
   | CNAME | `@`  | `jobuki-production.up.railway.app`   | ✅ On |

3. Cloudflare handles SSL automatically for `*.jobuki.co` on any paid plan,
   or you can use their free wildcard cert with a Full (strict) SSL mode.

4. Custom board domains (`jobs.acme.com`) — the board owner adds a CNAME
   in their DNS pointing to `jobuki-production.up.railway.app`, same proxy setup.

---

## 8. Project scripts reference

| Command | From | What it does |
|---|---|---|
| `pnpm dev` | root | Start dev server with watch |
| `pnpm build` | root | Production build |
| `pnpm typecheck` | root | TypeScript check across all packages |
| `pnpm db:generate` | `packages/db` | Generate migration from schema changes |
| `pnpm db:migrate` | `packages/db` | Apply pending migrations |
| `pnpm db:studio` | `packages/db` | Open Drizzle Studio UI |

---

## 9. Monorepo package structure

```
jobuki/
├── apps/
│   └── web-app/                  # React Router 7 + Express app
│       ├── server.js             # Entry point — Express + subdomain middleware
│       ├── app/
│       │   ├── routes/
│       │   │   ├── marketing/    # jobuki.co (public marketing site)
│       │   │   ├── admin/        # /dashboard (Clerk-protected admin)
│       │   │   └── board/        # acme.jobuki.co (public job boards)
│       │   ├── lib/theme.ts      # BoardTheme → CSS variables string
│       │   └── styles/globals.css # Token system + component classes
│       └── tailwind.config.ts    # Tailwind wired to CSS variables
├── packages/
│   ├── db/                       # Drizzle schema, client, migrations
│   └── types/                    # Shared TS types + DEFAULT_THEME
└── pnpm-workspace.yaml
```
