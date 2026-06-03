/**
 * Railway GraphQL API — custom domain management.
 *
 * Required env vars:
 *   RAILWAY_TOKEN          — Account API token (Railway → Account Settings → Tokens)
 *   RAILWAY_SERVICE_ID     — Found in Railway dashboard URL when viewing your service
 *   RAILWAY_ENVIRONMENT_ID — Found in Railway dashboard URL when viewing an environment
 */

const RAILWAY_API = 'https://backboard.railway.app/graphql/v2'

function getConfig() {
  const token = process.env.RAILWAY_TOKEN
  const serviceId = process.env.RAILWAY_SERVICE_ID
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID
  const looksPlaceholder = (value: string | undefined) => {
    if (!value) return true
    const v = value.trim().toLowerCase()
    return !v || v.startsWith('your_') || v.includes('replace_me')
  }

  if (!token || !serviceId || !environmentId || looksPlaceholder(token) || looksPlaceholder(serviceId) || looksPlaceholder(environmentId)) {
    throw new Error(
      'Railway config incomplete. Set real values for RAILWAY_TOKEN, RAILWAY_SERVICE_ID, and RAILWAY_ENVIRONMENT_ID.'
    )
  }

  return { token, serviceId, environmentId }
}

async function railwayQuery(query: string, token: string) {
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    throw new Error(`Railway API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  if (json.errors?.length) {
    throw new Error(`Railway API error: ${json.errors[0].message}`)
  }

  return json.data
}

// ── Add a custom domain to your Railway service ───────────────────────
export async function addCustomDomain(domain: string): Promise<{
  id: string
  domain: string
  status: string
}> {
  const { token, serviceId, environmentId } = getConfig()

  const data = await railwayQuery(
    `mutation {
      customDomainCreate(input: {
        domain: "${domain}",
        serviceId: "${serviceId}",
        environmentId: "${environmentId}"
      }) {
        id
        domain
        status {
          dnsRecords {
            required
            hostlabel
            recordType
            value
          }
        }
      }
    }`,
    token
  )

  return data.customDomainCreate
}

// ── Remove a custom domain from your Railway service ──────────────────
export async function removeCustomDomain(railwayDomainId: string): Promise<void> {
  const { token } = getConfig()

  await railwayQuery(
    `mutation {
      customDomainDelete(id: "${railwayDomainId}") {
        id
      }
    }`,
    token
  )
}

// ── Get current status of a custom domain ─────────────────────────────
export async function getCustomDomainStatus(railwayDomainId: string): Promise<{
  id: string
  domain: string
  status: string
}> {
  const { token } = getConfig()

  const data = await railwayQuery(
    `query {
      customDomain(id: "${railwayDomainId}") {
        id
        domain
        status {
          dnsRecords {
            required
            hostlabel
            recordType
            value
          }
        }
      }
    }`,
    token
  )

  return data.customDomain
}

// ── Validate domain format before hitting Railway ─────────────────────
export function isValidDomain(domain: string): boolean {
  // Basic domain validation — no protocol, no path, no port
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i
  return domainRegex.test(domain)
}
