import { test as setup, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STATE_FILE = path.join(__dirname, '../.state/board.json')
const BOARD_NAME = 'Jobuki E2E Test Board'
const BOARD_SLUG = 'jobuki-e2e-test'

setup('create test board', async ({ page }) => {
  await page.goto('/dashboard/boards/new')
  await expect(page.getByRole('heading', { name: /create a job board/i })).toBeVisible()

  // Fill name — slug auto-derives
  await page.getByLabel(/board name/i).fill(BOARD_NAME)

  // Wait for slug to auto-populate then verify
  await expect(page.getByPlaceholder(/acme-jobs/i)).toHaveValue(BOARD_SLUG, { timeout: 3000 })

  // Board type
  await page.getByLabel(/board type/i).selectOption('company')

  await page.getByRole('button', { name: /create board/i }).click()

  // Redirects to /dashboard/boards/:id after creation
  await expect(page).toHaveURL(/\/dashboard\/boards\/[a-z0-9]+$/, { timeout: 10_000 })

  const boardId = page.url().split('/').pop()!
  const boardUrl = `http://localhost:3000/jobs` // public board path for test board

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify({ boardId, boardSlug: BOARD_SLUG, boardName: BOARD_NAME, boardUrl }, null, 2))

  console.log(`[board.setup] Created test board: ${BOARD_SLUG} (${boardId})`)
})
