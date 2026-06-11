import { test, expect } from '@playwright/test'

test('boards list loads', async ({ page }) => {
  await page.goto('/dashboard/boards')
  await expect(page.locator('main')).toBeVisible()
})

test('can navigate to a board overview', async ({ page }) => {
  await page.goto('/dashboard/boards')
  await page.locator('a[href*="/dashboard/boards/"]').first().click()
  await expect(page).toHaveURL(/\/dashboard\/boards\//)
})

test('board sub-nav shows all tabs', async ({ page }) => {
  await page.goto('/dashboard/boards')
  await page.locator('a[href*="/dashboard/boards/"]').first().click()
  await expect(page.getByRole('link', { name: /content/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /import jobs/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /appearance/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
})
