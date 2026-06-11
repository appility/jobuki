import { test as base, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export { expect }

type BoardFixtures = {
  boardId: string
  boardSlug: string
  boardName: string
  boardUrl: string
}

function loadBoardState(): BoardFixtures {
  const stateFile = path.join(__dirname, '../.state/board.json')
  if (!fs.existsSync(stateFile)) {
    // Fall back to env var or localhost root when running without board setup
    const boardUrl = process.env.TEST_BOARD_URL ?? 'http://localhost:3000/'
    return { boardId: '', boardSlug: '', boardName: '', boardUrl }
  }
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'))
}

export const test = base.extend<BoardFixtures>({
  boardId: async ({}, use) => {
    await use(loadBoardState().boardId)
  },
  boardSlug: async ({}, use) => {
    await use(loadBoardState().boardSlug)
  },
  boardName: async ({}, use) => {
    await use(loadBoardState().boardName)
  },
  boardUrl: async ({}, use) => {
    await use(loadBoardState().boardUrl)
  },
})
