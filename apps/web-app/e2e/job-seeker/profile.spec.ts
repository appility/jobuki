import { test, expect } from '@playwright/test'

test('profile page loads', async ({ page }) => {
  await page.goto('/candidate/profile')
  await expect(page).toHaveURL(/\/candidate\/profile/)
  await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
})

test('can update name on profile', async ({ page }) => {
  await page.goto('/candidate/profile')
  const nameInput = page.getByLabel(/name/i)
  await nameInput.clear()
  await nameInput.fill('Test Candidate')
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText(/saved/i)).toBeVisible()
})
