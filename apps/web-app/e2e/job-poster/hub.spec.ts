import { test, expect } from '@playwright/test'

test('hiring hub loads', async ({ page }) => {
  await page.goto('/hiring')
  await expect(page).toHaveURL(/\/hiring/)
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
})

test('hub nav shows all sections', async ({ page }) => {
  await page.goto('/hiring')
  await expect(page.getByRole('link', { name: /overview/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /listings/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /applications/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /billing/i })).toBeVisible()
})

test('unauthenticated access redirects to sign-in', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined })
  const page = await ctx.newPage()
  await page.goto('/hiring')
  await expect(page).toHaveURL(/\/sign-in/)
  await ctx.close()
})
