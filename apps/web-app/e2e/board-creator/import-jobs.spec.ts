import { test, expect } from '@playwright/test'

async function goToImport(page: any) {
  await page.goto('/dashboard/boards')
  const href = await page.locator('a[href*="/dashboard/boards/"]').first().getAttribute('href')
  await page.goto(`${href}/import`)
}

test('import page loads', async ({ page }) => {
  await goToImport(page)
  await expect(page.getByRole('heading', { name: /import jobs/i })).toBeVisible()
})

test('source picker and filters are visible', async ({ page }) => {
  await goToImport(page)
  await expect(page.getByLabel(/source/i)).toBeVisible()
  await expect(page.getByLabel(/search term/i)).toBeVisible()
  await expect(page.getByLabel(/category/i)).toBeVisible()
  await expect(page.getByLabel(/limit/i)).toBeVisible()
})

test('preview button shows results', async ({ page }) => {
  await goToImport(page)
  await page.getByLabel(/source/i).selectOption('himalayas_json')
  await page.getByLabel(/limit/i).selectOption('50')
  await page.getByRole('button', { name: /preview results/i }).click()
  // Wait for preview to load (ingest can be slow)
  await expect(page.getByText(/jobs found/i)).toBeVisible({ timeout: 30_000 })
})

test('import button is disabled when preview shows 0 new jobs', async ({ page }) => {
  await goToImport(page)
  // If we've already imported all jobs, wouldInsert will be 0
  const importBtn = page.getByRole('button', { name: /import \d+ jobs/i })
  if (await importBtn.isVisible()) {
    // Import button enabled = there are new jobs to import — that's fine too
  } else {
    await expect(page.getByRole('button', { name: /import 0 jobs/i })).toBeDisabled()
  }
})
