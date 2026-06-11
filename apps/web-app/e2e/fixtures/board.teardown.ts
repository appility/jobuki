import { test as teardown, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STATE_FILE = path.join(__dirname, '../.state/board.json')

teardown('delete test board', async ({ page }) => {
  if (!fs.existsSync(STATE_FILE)) {
    console.warn('[board.teardown] No state file found — skipping')
    return
  }

  const { boardId, boardSlug } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))

  await page.goto(`/dashboard/boards/${boardId}/settings`)
  await expect(page.getByRole('button', { name: /delete board/i })).toBeVisible()

  // Open delete dialog
  await page.getByRole('button', { name: /delete board/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Type the slug to confirm
  await page.getByPlaceholder(boardSlug).fill(boardSlug)

  // Confirm button should now be enabled
  const confirmBtn = page.locator('[role="dialog"] button[type="submit"]')
  await expect(confirmBtn).toBeEnabled()
  await confirmBtn.click()

  // Redirects away after deletion
  await expect(page).toHaveURL(/\/dashboard\/boards$/, { timeout: 10_000 })

  fs.unlinkSync(STATE_FILE)
  console.log(`[board.teardown] Deleted test board: ${boardSlug} (${boardId})`)
})
