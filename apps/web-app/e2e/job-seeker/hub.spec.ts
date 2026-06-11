import { test, expect } from '@playwright/test'

test('candidate hub loads', async ({ page }) => {
  await page.goto('/candidate')
  await expect(page).toHaveURL(/\/candidate/)
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
})

test('hub header logo links to board homepage', async ({ page }) => {
  await page.goto('/candidate')
  const logo = page.locator('header a[href="/"]')
  await expect(logo).toBeVisible()
  await logo.click()
  await expect(page).toHaveURL('/')
})

test('hub nav shows all sections', async ({ page }) => {
  await page.goto('/candidate')
  await expect(page.getByRole('link', { name: /overview/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /saved jobs/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /applications/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /profile/i })).toBeVisible()
})

test('avatar dropdown opens and contains expected items', async ({ page }) => {
  await page.goto('/candidate')
  await page.locator('header button[aria-label="Account menu"]').click()
  await expect(page.getByRole('button', { name: /my hub/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /browse jobs/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /manage account/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
})

test('applications page loads', async ({ page }) => {
  await page.goto('/candidate/applications')
  await expect(page.locator('main')).toBeVisible()
})

test('unauthenticated access redirects to sign-in', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined })
  const page = await ctx.newPage()
  await page.goto('/candidate')
  await expect(page).toHaveURL(/\/sign-in/)
  await ctx.close()
})
