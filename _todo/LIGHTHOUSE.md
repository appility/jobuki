# Lighthouse Performance Plan

**URL tested:** crypto-jobs-today.jobuki.com  
**Run 1** (2026-06-10T12:52:20) — slow server: Performance **75/100**  
**Run 2** (2026-06-10T12:53:54) — after fix: Performance **97/100**

---

## What the two runs tell us

The Run 1 bottleneck was entirely server response time — **1,896 ms TTFB**. This cascaded into
bad FCP (2.1s), LCP (2.4s), and Speed Index (2.2s). Run 2 shows those resolved once the server
responded quickly (~800ms FCP, ~975ms LCP). The geo-ranking code that was crashing the home loader
(`rankedJobs` TDZ bug, fixed same day) was almost certainly the cause.

Run 2 is now **97/100** but has a cluster of structural issues that remain regardless of server
speed. Those are the targets below.

---

## Core Web Vitals comparison

| Metric | Run 1 | Run 2 | Target |
|--------|-------|-------|--------|
| FCP | 2.1 s | **0.8 s** ✓ | < 1.8 s |
| LCP | 2.4 s | **1.0 s** ✓ | < 2.5 s |
| TBT | 60 ms | 100 ms ⚠️ | < 200 ms |
| CLS | 0.01 | 0.01 ✓ | < 0.1 |
| Speed Index | 2.2 s | **0.9 s** ✓ | < 3.4 s |
| TTI | 2.2 s | **1.1 s** ✓ | < 3.8 s |

TBT went slightly backwards (60ms → 100ms) — worth watching but still fine at 97/100.

---

## Issues to fix (prioritised)

---

### 1. Accessibility — color contrast `score: 0.0` (both runs)

**Problem:** Low-contrast text somewhere in the board layout. Lighthouse flags it as a hard
failure.

**Fix:**
- Run `npx @axe-core/cli https://crypto-jobs-today.jobuki.com` to get the exact elements
- Most likely candidates: `var(--color-text-muted)` on `var(--color-background)`, or badge
  foreground colours
- Check `contrastRatio()` calls in `lib/color.ts` — the publish check already uses this,
  use it to audit theme tokens too
- Fix in the board's theme config or in the CSS variable defaults in `lib/theme.ts`

**Impact:** Accessibility score 93 → 100

---

### 2. Missing `<main>` landmark `score: 0.0` (both runs)

**Problem:** `document does not have a main landmark` — the public board home rendered by
`PublicBoardHome` uses `<div>` containers, not `<main>`.

**Fix:** In `components/public-board-home.tsx`, change the outermost content wrapper from
`<div className="jp-board">` to include a `<main>` element wrapping the job list section.
Same fix needed in `routes/board/index.tsx`, `routes/board/job.tsx` etc. — they already use
`<main>` tags but check the `PublicBoardHome` component specifically.

**Impact:** Accessibility score 93 → 100, semantic HTML improvement

---

### 3. Render-blocking Google Fonts `score: 0.5` (both runs)

**Problem:** 3–4 Google Fonts stylesheet requests block rendering. Each adds ~60–100ms
regardless of server speed.

```
fonts.googleapis.com/css2?family=Unbounded…    821 bytes
fonts.googleapis.com/css2?family=Plus+Jakarta… 1,940 bytes
fonts.googleapis.com/css2?family=DM+Sans…      1,842 bytes
/assets/globals-OA9VMYqj.css                   10,723 bytes
```

**Fix options (pick one):**

**Option A — `font-display: optional` (simplest):** Add `&display=optional` to all Google
Fonts URLs in `lib/fonts.ts`. The browser won't block render waiting for fonts — falls back to
system font on first paint, swaps when loaded.

**Option B — Preconnect + preload (recommended):** Add to `root.tsx`:
```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
```
Then preload the specific font files (woff2) directly rather than loading via CSS.

**Option C — Self-host fonts:** Download woff2 files, serve from `/public/fonts/`, define
`@font-face` in `globals.css`. Eliminates the external request entirely.

Option B is the best balance of effort vs impact. Option C is ideal long term.

**Impact:** FCP -50–100ms, LCP -50–100ms

---

### 4. Unused JavaScript — Clerk `score: 0.5` (both runs)

**Problem:** Clerk auth libraries load ~207 KiB of unused JavaScript on every page view.
The public board home doesn't need auth at all — most visitors are anonymous job seekers.

```
@clerk/ui ui-common…      83 KB wasted (71%)
@clerk/clerk-js…          51 KB wasted (73%)
@clerk/ui vendors…        46 KB wasted (98%)
@clerk/ui ui.browser…     31 KB wasted (73%)
```

**Fix:** Clerk is loaded globally in `root.tsx` via `ClerkProvider`. The public board routes
don't need it. Options:

**Option A — Lazy-load Clerk:** Only initialise `ClerkProvider` when the user navigates to
an auth-required route (`/candidate`, `/hiring`, `/dashboard`, `/sign-in`, `/sign-up`).
On public board routes render without `ClerkProvider`.

**Option B — Use `<SignedIn>` / `<SignedOut>` Clerk components** to avoid rendering
auth-dependent UI until Clerk loads — reduces blocking even if the script still loads.

This is the most impactful remaining fix: TBT would drop back toward 60ms and overall
performance would likely hit 99/100.

**Impact:** TBT -40–60ms, Unused JS -200 KiB, performance score 97 → 99

---

### 5. LCP image not discoverable from HTML `score: 0.0` (both runs)

**Problem:** The LCP element (likely the board logo or hero image) is loaded via JavaScript
or CSS rather than an `<img>` tag in the initial HTML, so the browser's preload scanner can't
find it early.

**Fix:**
- If the LCP is the board logo: ensure it's an `<img>` tag (it already is in `board/layout.tsx`)
  with `loading="eager"` and `fetchpriority="high"` attributes
- If it's the hero background image (loaded via CSS `backgroundImage`): add an explicit
  `<link rel="preload" as="image" href={heroImageUrl}>` in the `<head>` when a hero image
  is set
- Add `fetchpriority="high"` to the board logo `<img>` in `routes/board/layout.tsx`

**Impact:** LCP -100–200ms

---

### 6. Unsized footer logo image `score: 0.5` (both runs)

**Problem:** Footer logo image in `PublicBoardHome` has `height: 28px` but no explicit `width`
attribute, causing layout shift while the image loads.

**Fix:** In `components/public-board-home.tsx`, find the footer logo `<img>` and add
`width="auto"` or calculate the intrinsic width. The simplest fix is `width={0} height={28}`
with `style={{ width: 'auto' }}` — this tells the browser the height is 28px while keeping
aspect ratio flexible, preventing CLS.

**Impact:** CLS stability improvement, image sizing audit pass

---

### 7. Source maps missing `score: 0.0` (both runs)

**Problem:** Lighthouse can't find source maps for large first-party JS bundles. This is a
devtools/debugging concern, not a user-facing issue.

**Fix:** In `vite.config.ts` (or `react-router.config.ts`), enable source map generation for
production builds:
```ts
build: { sourcemap: true }
```
Or suppress the audit if you don't want public source maps:
```ts
build: { sourcemap: false } // already the case — add X-SourceMap: false header
```

**Impact:** Best Practices audit only — no effect on performance or accessibility scores

---

## Recommended fix order

| Priority | Fix | Effort | Score impact |
|---|---|---|---|
| 1 | `<main>` landmark in PublicBoardHome | 15 min | Accessibility +7 |
| 2 | `fetchpriority="high"` on LCP image | 5 min | LCP -100ms |
| 3 | Preconnect for Google Fonts | 10 min | FCP -50ms |
| 4 | Fix color contrast violations | 30 min | Accessibility +7 |
| 5 | Unsized footer logo | 5 min | CLS fix |
| 6 | Lazy-load Clerk on public routes | 2–3 hrs | TBT -40ms, JS -200KB |
| 7 | Self-host fonts | 1 hr | FCP -100ms |

Items 1–5 are quick wins that can be done in one sitting. Item 6 (Clerk lazy-loading) is the
biggest remaining performance gain but needs care — test auth flows thoroughly after.
