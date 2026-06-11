# Job Alerts & Notifications

Allow candidates to subscribe to searches and receive email digests when new matching jobs are posted.
Modelled on the red-kite implementation but simplified for a multi-board job platform.

---

## Architecture overview

```
Candidate sets up alert (search term + optional board + filters)
        ↓
job_alerts row created in DB
        ↓
pg-boss cron fires daily at 08:00 UTC
        ↓
For each enabled alert: find jobs published since lastNotifiedAt matching searchTerm
        ↓
If matches found: enqueue send-job-alert job per alert
        ↓
pg-boss worker sends email via Resend
        ↓
Log to job_alert_log, update lastNotifiedAt
```

---

## 1. New dependencies

```bash
pnpm add --filter @jobuki/web-app resend pg-boss
pnpm add -D --filter @jobuki/web-app @types/pg-boss
```

- **Resend** — email sending (same as red-kite). Get key from resend.com.
- **pg-boss** — reliable job queue backed by Postgres. Uses the same DATABASE_URL — no extra infrastructure.

New env vars required:
```
RESEND_API_KEY=re_...
RESEND_FROM=alerts@jobuki.com    # verified sender domain
```

---

## 2. Database schema (packages/db)

### `job_alerts` table

```ts
export const jobAlerts = pgTable('job_alerts', {
  id:             text('id').primaryKey().$defaultFn(() => createId()),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  boardId:        text('board_id').references(() => boards.id, { onDelete: 'cascade' }),  // null = any board
  searchTerm:     text('search_term').notNull(),        // the query string
  categories:     jsonb('categories').$type<string[]>().default([]),
  remoteOnly:     boolean('remote_only').notNull().default(false),
  enabled:        boolean('enabled').notNull().default(true),
  lastNotifiedAt: timestamp('last_notified_at'),        // null = never sent
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
})
```

### `job_alert_log` table

```ts
export const jobAlertLog = pgTable('job_alert_log', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  alertId:       text('alert_id').notNull().references(() => jobAlerts.id, { onDelete: 'cascade' }),
  userId:        text('user_id').notNull(),
  jobCount:      integer('job_count').notNull(),
  jobIds:        jsonb('job_ids').$type<string[]>().notNull().default([]),
  status:        text('status').notNull().default('pending'),  // pending | sent | failed
  resendEmailId: text('resend_email_id'),
  sentAt:        timestamp('sent_at').notNull().defaultNow(),
})
```

Migration: `pnpm --filter @jobuki/db db:generate && pnpm --filter @jobuki/db db:migrate`

---

## 3. pg-boss queue setup

### `apps/web-app/app/lib/queue.server.ts`

```ts
import PgBoss from 'pg-boss'

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

let started = false
export async function getQueue() {
  if (!started) { await boss.start(); started = true }
  return boss
}
```

### Job names

```ts
export const JOBS = {
  SEND_JOB_ALERT: 'send-job-alert',
  PROCESS_ALERTS:  'process-alerts',   // fan-out — called by cron, enqueues per-alert sends
} as const
```

---

## 4. Worker

### `apps/web-app/app/lib/worker.server.ts`

Started in-process alongside the Express server (same pattern as red-kite).

```ts
import { getQueue, JOBS } from './queue.server'
import { processAlerts } from './alerts/process-alerts.server'
import { sendJobAlert }  from './alerts/send-job-alert.server'

export async function startWorker() {
  const queue = await getQueue()

  // Daily cron — fire at 08:00 UTC
  await queue.schedule(JOBS.PROCESS_ALERTS, '0 8 * * *', {})

  // Fan-out: for each eligible alert, enqueue a send
  queue.work(JOBS.PROCESS_ALERTS, processAlerts)

  // Per-alert email send (concurrency 3 to respect Resend rate limits)
  queue.work(JOBS.SEND_JOB_ALERT, { teamConcurrency: 3 }, sendJobAlert)
}
```

Call `startWorker()` in `server.js` after the express app starts.

---

## 5. Alert processing logic

### `apps/web-app/app/lib/alerts/process-alerts.server.ts`

```ts
export async function processAlerts() {
  // 1. Fetch all enabled alerts
  // 2. For each alert:
  //    a. Find jobs on that board (or all boards if boardId is null) published since lastNotifiedAt
  //    b. Filter: title or description contains searchTerm (word-boundary match)
  //    c. Apply categories filter if set
  //    d. Apply remoteOnly filter if set
  //    e. If matches.length > 0: enqueue SEND_JOB_ALERT
  // 3. Done (no bulk update — lastNotifiedAt updated per send)
}
```

Matching query (Postgres ilike for simplicity, no embedding needed):
```sql
WHERE board_id = $boardId
  AND status = 'published'
  AND created_at > $lastNotifiedAt (or > NOW() - interval '25 hours' if null)
  AND (
    title ILIKE '%' || $searchTerm || '%'
    OR description ILIKE '%' || $searchTerm || '%'
    OR company ILIKE '%' || $searchTerm || '%'
  )
```

---

## 6. Email sending

### `apps/web-app/app/lib/alerts/send-job-alert.server.ts`

```ts
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendJobAlert(job) {
  const { alertId, userId, jobIds } = job.data
  // 1. Fetch user email from DB
  // 2. Re-fetch job rows (fresh data)
  // 3. Render HTML email (template)
  // 4. resend.emails.send({ from, to, subject, html })
  // 5. Insert job_alert_log row (status: sent)
  // 6. Update job_alerts.lastNotifiedAt = now()
}
```

### Email template

HTML template at `apps/web-app/app/lib/alerts/email-template.ts`

Structure:
- Subject: "3 new [searchTerm] jobs on [boardName]"
- Header: board logo + name
- Intro: "Hi [name], here are new roles matching '[searchTerm]'"
- Job cards: title, company, location, remote badge, apply link
- Footer: unsubscribe link → `/candidate/notifications?unsubscribe=[alertId]`

---

## 7. API routes

### `POST /api/job-alerts` — create alert

Request body:
```json
{
  "searchTerm": "typescript",
  "boardId": "optional-board-id",
  "categories": ["engineering"],
  "remoteOnly": false
}
```

Auth: requireUser (job_seeker). Max 10 active alerts per user.

### `GET /candidate/notifications` — list + manage alerts (page, not API)

Loader fetches all alerts for the user. Action handles toggle/delete.

### `POST /api/cron/job-alerts` — manual cron trigger

Protected by INGEST_SECRET bearer token. Immediately enqueues PROCESS_ALERTS job.
Used for testing or Railway cron service override.

### `GET /apply/:jobId?alert=alertId` — unsubscribe via email link

Or: `/candidate/notifications?unsubscribe=alertId` — sets enabled=false on that alert.

---

## 8. UI changes

### Search bar → "Get alerts" button

On `/jobs` and `/jobs/category/:category` pages, after a search is entered, show:
```
🔔 Get notified when new [term] jobs are posted → [Set alert]
```
Clicking opens a small modal/inline form to confirm the alert, then POSTs to `/api/job-alerts`.

### `/candidate/notifications` page

New route under candidate hub. Shows:
- List of active alerts (search term, board, last notified, toggle on/off, delete)
- "Add new alert" form
- Empty state with prompt to search and set alerts

Nav item: "Notifications" in the candidate sidebar.

---

## 9. Routes to register

```ts
// routes.ts additions:
route('api/job-alerts',         'routes/api/job-alerts.ts'),
route('api/cron/job-alerts',    'routes/api/cron.job-alerts.ts'),
route('candidate/notifications','routes/candidate/notifications.tsx'),
```

---

## 10. Implementation order

1. Install `resend` + `pg-boss`
2. DB schema + migration (`job_alerts`, `job_alert_log`)
3. Queue setup (`lib/queue.server.ts`, `lib/worker.server.ts`)
4. Alert processing (`lib/alerts/process-alerts.server.ts`)
5. Email send + template (`lib/alerts/send-job-alert.server.ts`)
6. API routes (`api/job-alerts.ts`, `api/cron.job-alerts.ts`)
7. Candidate notifications page (`candidate/notifications.tsx`)
8. Search bar "Set alert" CTA on browse pages
9. Wire `startWorker()` into `server.js`
10. Add env vars to Railway: `RESEND_API_KEY`, `RESEND_FROM`

---

## Key differences from red-kite

| Aspect | Red Kite | Jobuki |
|--------|----------|--------|
| Matching | Semantic (embeddings) + keyword | Keyword ILIKE only |
| Scope | Single org, all tenders | Per-candidate, multi-board |
| Alert trigger | fitScore threshold | Any new job matching term |
| Email frequency | Min 23h between sends | Daily digest at 08:00 UTC |
| Channels | Email + Slack + Teams + OneSignal | Email only (phase 1) |
| Unsubscribe | Per-user per-org | Per-alert (link in email) |

---

## Railway cron service (alternative to in-process worker)

If pg-boss in-process causes issues on Railway's single-process model, extract to a separate
Railway Cron Job service (same as the ingest cron):

```
Command: node apps/web-app/scripts/process-alerts.mjs
Schedule: 0 8 * * *
Env vars: DATABASE_URL, RESEND_API_KEY, RESEND_FROM, APP_URL, INGEST_SECRET
```

This avoids needing pg-boss entirely — the cron script calls `POST /api/cron/job-alerts` directly.
