import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import path from 'path'

// Load from web-app's .env.local — drizzle-kit only auto-loads .env, not .env.local
config({ path: path.resolve(__dirname, '../../apps/web-app/.env.local') })

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Use DIRECT_URL for migrations — pgbouncer (DATABASE_URL) doesn't support DDL
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
})
