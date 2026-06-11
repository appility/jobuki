import { fileURLToPath } from 'url'
import path from 'path'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env.test'), override: false })
config({ path: path.resolve(__dirname, '../../.env.local'), override: false })

const SECRET = process.env.CLERK_SECRET_KEY_TEST ?? process.env.CLERK_SECRET_KEY

/**
 * Deletes a Clerk user by email address via the Clerk Backend API.
 * Used in afterAll blocks to clean up ephemeral test users created during registration tests.
 */
export async function deleteClerkUserByEmail(email: string): Promise<void> {
  if (!SECRET) {
    console.warn('[clerk-cleanup] No CLERK_SECRET_KEY_TEST set — skipping user cleanup')
    return
  }

  // Find user by email
  const searchRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${SECRET}` } }
  )

  if (!searchRes.ok) {
    console.warn(`[clerk-cleanup] Failed to search for user ${email}: ${searchRes.status}`)
    return
  }

  const users = await searchRes.json() as Array<{ id: string }>
  if (!users.length) {
    console.warn(`[clerk-cleanup] No Clerk user found for ${email}`)
    return
  }

  const userId = users[0].id
  const deleteRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${SECRET}` },
  })

  if (deleteRes.ok) {
    console.log(`[clerk-cleanup] Deleted Clerk user ${email} (${userId})`)
  } else {
    console.warn(`[clerk-cleanup] Failed to delete ${email}: ${deleteRes.status}`)
  }
}

/** Generates a unique test email that uses Clerk's +clerk_test bypass */
export function testEmail(prefix: string): string {
  return `${prefix}+${Date.now()}clerk_test@jobuki.com`
}
