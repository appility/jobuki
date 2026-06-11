import { test, expect } from '../fixtures'

test('homepage loads without auth', async ({ page, boardUrl }) => {
  await page.goto(boardUrl)
  await expect(page).not.toHaveURL(/\/sign-in/)
  await expect(page.locator('header')).toBeVisible()
})

test('jobs listing page loads', async ({ page, boardUrl }) => {
  await page.goto(boardUrl)
  await expect(page.locator('main')).toBeVisible()
})

test('job detail page loads', async ({ page, boardUrl }) => {
  await page.goto(boardUrl)
  const firstJob = page.locator('a[href*="/jobs/"]').first()
  await expect(firstJob).toBeVisible()
  await firstJob.click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /apply/i })).toBeVisible()
})

test('clicking save redirects to sign-in', async ({ page, boardUrl }) => {
  await page.goto(boardUrl)
  await page.locator('a[href*="/jobs/"]').first().click()
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page).toHaveURL(/\/candidate\/start|\/sign-in/)
})

test('health endpoint returns 200', async ({ request }) => {
  const res = await request.get('/health')
  expect(res.status()).toBe(200)
})
