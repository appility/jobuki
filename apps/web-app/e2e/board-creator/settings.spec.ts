import { test, expect } from '@playwright/test'

async function goToSettings(page: any) {
  await page.goto('/dashboard/boards')
  const href = await page.locator('a[href*="/dashboard/boards/"]').first().getAttribute('href')
  await page.goto(`${href}/settings`)
}

test('settings page loads', async ({ page }) => {
  await goToSettings(page)
  await expect(page.locator('main')).toBeVisible()
})

test('publish/unpublish toggle is visible', async ({ page }) => {
  await goToSettings(page)
  await expect(page.getByRole('button', { name: /publish|unpublish/i })).toBeVisible()
})

test('danger zone delete button is visible', async ({ page }) => {
  await goToSettings(page)
  await expect(page.getByRole('button', { name: /delete board/i })).toBeVisible()
})

test('delete requires slug confirmation', async ({ page }) => {
  await goToSettings(page)
  await page.getByRole('button', { name: /delete board/i }).click()
  // Dialog should appear
  await expect(page.getByRole('dialog')).toBeVisible()
  // Confirm button should be disabled without typing slug
  const confirmBtn = page.getByRole('button', { name: /delete board/i }).last()
  await expect(confirmBtn).toBeDisabled()
})
