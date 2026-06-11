import { test, expect } from '@playwright/test'

const BOARD = process.env.TEST_BOARD_URL ?? '/'

test('can browse jobs listing', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('a[href*="/jobs/"]').first()).toBeVisible()
})

test('can search for jobs', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  await page.getByRole('textbox', { name: /search/i }).fill('engineer')
  await page.getByRole('button', { name: /search/i }).click()
  await expect(page).toHaveURL(/q=engineer/)
})

test('can filter by category', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  const pill = page.locator('a[href*="/jobs/category/"]').first()
  const category = await pill.textContent()
  await pill.click()
  await expect(page).toHaveURL(/\/jobs\/category\//)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(category?.trim() ?? '')
})

test('can view job detail', async ({ page }) => {
  await page.goto(`${BOARD}jobs`)
  await page.locator('a[href*="/jobs/"]').first().click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('text=Apply')).toBeVisible()
})
