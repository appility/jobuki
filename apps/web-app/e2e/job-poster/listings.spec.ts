import { test, expect } from '@playwright/test'

test('listings page loads', async ({ page }) => {
  await page.goto('/hiring/listings')
  await expect(page).toHaveURL(/\/hiring\/listings/)
  await expect(page.locator('main')).toBeVisible()
})

test('applications page loads', async ({ page }) => {
  await page.goto('/hiring/applications')
  await expect(page).toHaveURL(/\/hiring\/applications/)
  await expect(page.locator('main')).toBeVisible()
})

test('billing page loads', async ({ page }) => {
  await page.goto('/hiring/billing')
  await expect(page).toHaveURL(/\/hiring\/billing/)
  await expect(page.locator('main')).toBeVisible()
})
