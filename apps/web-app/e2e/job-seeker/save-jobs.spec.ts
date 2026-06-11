import { test, expect } from '@playwright/test'

const BOARD = process.env.TEST_BOARD_URL ?? '/'

test('can save a job from job detail page', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  await page.locator('a[href*="/jobs/"]').first().click()
  const saveBtn = page.getByRole('button', { name: /♡ save/i })
  await expect(saveBtn).toBeVisible()
  await saveBtn.click()
  await expect(page.getByRole('button', { name: /♥ saved/i })).toBeVisible()
})

test('saved job appears in candidate hub saved list', async ({ page }) => {
  // Save a job first
  await page.goto(`${BOARD}jobs`)
  await page.locator('a[href*="/jobs/"]').first().click()
  const saveBtn = page.getByRole('button', { name: /save/i })
  if (await saveBtn.isVisible()) await saveBtn.click()

  // Check saved list
  await page.goto('/candidate/saved')
  await expect(page.locator('a[href*="/jobs/"]').first()).toBeVisible()
})

test('can unsave a job', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  await page.locator('a[href*="/jobs/"]').first().click()

  // Ensure saved
  const unsaveBtn = page.getByRole('button', { name: /♥ saved/i })
  const saveBtn = page.getByRole('button', { name: /♡ save/i })
  if (await saveBtn.isVisible()) {
    await saveBtn.click()
    await expect(unsaveBtn).toBeVisible()
  }

  await unsaveBtn.click()
  await expect(page.getByRole('button', { name: /♡ save/i })).toBeVisible()
})
