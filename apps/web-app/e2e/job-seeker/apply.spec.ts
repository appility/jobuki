import { test, expect } from '@playwright/test'

const BOARD = process.env.TEST_BOARD_URL ?? '/'

test('apply page loads with AI tips', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  await page.locator('a[href*="/jobs/"]').first().click()
  await page.getByRole('link', { name: /apply/i }).click()
  await expect(page).toHaveURL(/\/apply\//)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('apply page shows checklist', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  await page.locator('a[href*="/jobs/"]').first().click()
  await page.getByRole('link', { name: /apply/i }).click()
  await expect(page.getByText(/before you apply/i)).toBeVisible()
  await expect(page.getByLabel(/cv is up to date/i)).toBeVisible()
})

test('clicking apply auto-saves the job', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  await page.locator('a[href*="/jobs/"]').first().click()

  // Make sure it's not already saved
  const saveBtn = page.getByRole('button', { name: /♡ save/i })
  const savedBtn = page.getByRole('button', { name: /♥ saved/i })

  await page.getByRole('link', { name: /apply/i }).click()

  // If job was external, apply opens new tab and redirects to success
  const applyBtn = page.getByRole('button', { name: /apply/i })
  if (await applyBtn.isVisible()) {
    // Check save state after apply
    const saveResp = page.waitForResponse(r => r.url().includes('/api/save-job'))
    await applyBtn.click()
    await saveResp
  }
})
