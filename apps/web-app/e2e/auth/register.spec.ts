import { test, expect } from '@playwright/test'
import { testEmail, deleteClerkUserByEmail } from '../fixtures/clerk-cleanup'

// Clerk dev environment: emails ending in +clerk_test bypass email delivery
// Verification code is always 424242
const CLERK_TEST_OTP = '424242'

async function fillVerificationCode(page: any) {
  // Clerk renders 6 separate digit inputs for the OTP
  const digits = page.locator('input[aria-label*="digit"]')
  const count = await digits.count()
  if (count === 6) {
    for (let i = 0; i < 6; i++) {
      await digits.nth(i).fill(CLERK_TEST_OTP[i])
    }
  } else {
    // Single input fallback
    await page.locator('input[name="code"]').fill(CLERK_TEST_OTP)
  }
}

test.describe('Register as job seeker', () => {
  let email: string

  test.beforeAll(() => {
    email = testEmail('e2e-seeker')
  })

  test.afterAll(async () => {
    await deleteClerkUserByEmail(email)
  })

  test('can sign up, verify email and land on /candidate', async ({ page }) => {
    await page.goto('/sign-up?type=job-seeker')

    await page.getByLabel(/email/i).fill(email)
    await page.locator('input[name="password"]').fill('TestPassword123!')
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()

    // Email verification step
    await fillVerificationCode(page)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()

    // Should land on /candidate/start then redirect to /candidate
    await expect(page).toHaveURL(/\/candidate/, { timeout: 15_000 })
  })
})

test.describe('Register as board creator', () => {
  let email: string

  test.beforeAll(() => {
    email = testEmail('e2e-creator')
  })

  test.afterAll(async () => {
    await deleteClerkUserByEmail(email)
  })

  test('can sign up, verify email and land on /dashboard', async ({ page }) => {
    await page.goto('/sign-up?type=board-creator')

    await page.getByLabel(/email/i).fill(email)
    await page.locator('input[name="password"]').fill('TestPassword123!')
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()

    await fillVerificationCode(page)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })
})

test.describe('Register as job poster', () => {
  let email: string

  test.beforeAll(() => {
    email = testEmail('e2e-poster')
  })

  test.afterAll(async () => {
    await deleteClerkUserByEmail(email)
  })

  test('can sign up, verify email and land on /hiring', async ({ page }) => {
    await page.goto('/sign-up?type=job-poster')

    await page.getByLabel(/email/i).fill(email)
    await page.locator('input[name="password"]').fill('TestPassword123!')
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()

    await fillVerificationCode(page)
    await page.locator('button[data-localization-key="formButtonPrimary"]').click()

    await expect(page).toHaveURL(/\/hiring/, { timeout: 15_000 })
  })
})
