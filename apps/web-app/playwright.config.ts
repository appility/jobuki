import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.test first, then .env.local — .env.test takes precedence
config({ path: path.resolve(__dirname, '.env.test'), override: false })
config({ path: path.resolve(__dirname, '.env.local'), override: false })

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,

  // Start the server locally if BASE_URL isn't overridden (e.g. pointing at Railway)
  webServer: process.env.BASE_URL ? undefined : {
    command: 'node --env-file-if-exists .env --env-file-if-exists .env.local server.js',
    url: 'http://localhost:3000/health',
    reuseExistingServer: true,
    timeout: 60_000,
  },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // ── 1. Auth setup — signs in once per user type ──────────────────
    {
      name: 'auth-setup',
      testMatch: /fixtures\/auth\.setup\.ts/,
    },

    // ── 2. Board setup — creates test board, saves ID to .state/ ─────
    {
      name: 'board-setup',
      testMatch: /fixtures\/board\.setup\.ts/,
      dependencies: ['auth-setup'],
      teardown: 'board-teardown',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/board-creator.json',
      },
    },

    // ── 3. Test suites — all depend on both setup steps ──────────────
    {
      name: 'public',
      testDir: './e2e/public',
      dependencies: ['board-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'job-seeker',
      testDir: './e2e/job-seeker',
      dependencies: ['board-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/job-seeker.json',
      },
    },
    {
      name: 'board-creator',
      testDir: './e2e/board-creator',
      dependencies: ['board-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/board-creator.json',
      },
    },
    {
      name: 'job-poster',
      testDir: './e2e/job-poster',
      dependencies: ['board-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/job-poster.json',
      },
    },

    // ── Registration flow tests — no stored auth, creates/deletes users each run ──
    {
      name: 'auth',
      testDir: './e2e/auth',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── 4. Board teardown — runs after board-setup's tests complete ──
    {
      name: 'board-teardown',
      testMatch: /fixtures\/board\.teardown\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/board-creator.json',
      },
    },
  ],
})
