import { test, expect } from '@playwright/test'

test.describe('Sign in', () => {

  test('job seeker lands on /candidate after sign in', async ({ page }) => {
    await page.goto('/sign-in?type=job-seeker')
    await page.getByLabel(/email/i).fill(process.env.TEST_JOB_SEEKER_EMAIL!)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()
    await page.locator('input[name="password"]').fill(process.env.TEST_JOB_SEEKER_PASSWORD!)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()
    await expect(page).toHaveURL(/\/candidate/, { timeout: 15_000 })
  })

  test('board creator lands on /dashboard after sign in', async ({ page }) => {
    await page.goto('/sign-in?type=board-creator')
    await page.getByLabel(/email/i).fill(process.env.TEST_BOARD_CREATOR_EMAIL!)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()
    await page.locator('input[name="password"]').fill(process.env.TEST_BOARD_CREATOR_PASSWORD!)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('job poster lands on /hiring after sign in', async ({ page }) => {
    await page.goto('/sign-in?type=job-poster')
    await page.getByLabel(/email/i).fill(process.env.TEST_JOB_POSTER_EMAIL!)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()
    await page.locator('input[name="password"]').fill(process.env.TEST_JOB_POSTER_PASSWORD!)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()
    await expect(page).toHaveURL(/\/hiring/, { timeout: 15_000 })
  })

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/sign-in?type=job-seeker')
    await page.getByLabel(/email/i).fill(process.env.TEST_JOB_SEEKER_EMAIL!)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()
    await page.locator('input[name="password"]').fill('wrongpassword')
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()
    await expect(page).toHaveURL(/\/sign-in/)
    await expect(page.locator('.cl-formFieldErrorText, .cl-alert')).toBeVisible()
  })

  test('sign-in page shows type switcher links', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('link', { name: /board creator/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /job seeker/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /job poster/i })).toBeVisible()
  })

})
