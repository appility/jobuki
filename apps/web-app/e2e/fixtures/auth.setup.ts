import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, '../.auth')

async function signIn(page: any, email: string, password: string, storageFile: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(email)
  await page.locator('button[data-localization-key="formButtonPrimary"]').click()
  await page.locator('input[name="password"]').fill(password)
  await page.locator('button[data-localization-key="formButtonPrimary"]').click()
  // Wait for redirect away from sign-in
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 })
  await page.context().storageState({ path: storageFile })
}

setup('authenticate as job seeker', async ({ page }) => {
  const email    = process.env.TEST_JOB_SEEKER_EMAIL!
  const password = process.env.TEST_JOB_SEEKER_PASSWORD!
  if (!email || !password) throw new Error('TEST_JOB_SEEKER_EMAIL / TEST_JOB_SEEKER_PASSWORD not set')
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  await page.goto('/sign-in?type=job-seeker')
  await signIn(page, email, password, path.join(AUTH_DIR, 'job-seeker.json'))
})

setup('authenticate as board creator', async ({ page }) => {
  const email    = process.env.TEST_BOARD_CREATOR_EMAIL!
  const password = process.env.TEST_BOARD_CREATOR_PASSWORD!
  if (!email || !password) throw new Error('TEST_BOARD_CREATOR_EMAIL / TEST_BOARD_CREATOR_PASSWORD not set')
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  await page.goto('/sign-in?type=board-creator')
  await signIn(page, email, password, path.join(AUTH_DIR, 'board-creator.json'))
})

setup('authenticate as job poster', async ({ page }) => {
  const email    = process.env.TEST_JOB_POSTER_EMAIL!
  const password = process.env.TEST_JOB_POSTER_PASSWORD!
  if (!email || !password) throw new Error('TEST_JOB_POSTER_EMAIL / TEST_JOB_POSTER_PASSWORD not set')
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  await page.goto('/sign-in?type=job-poster')
  await signIn(page, email, password, path.join(AUTH_DIR, 'job-poster.json'))
})
