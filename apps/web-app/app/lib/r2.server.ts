import { randomUUID } from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const

export const MAX_UPLOAD_BYTES = {
  logo: 2 * 1024 * 1024,
  header: 6 * 1024 * 1024,
} as const

type UploadKind = keyof typeof MAX_UPLOAD_BYTES

type R2Config = {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl: string
}

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, '')
}

function parseLegacyEndpointAndBucket(value: string): { endpoint: string; bucket: string } {
  const parsed = new URL(value)
  const bucket = parsed.pathname.split('/').filter(Boolean)[0]
  if (!bucket) {
    throw new Error('Invalid CLOUDFLARE_R2 format. Expected endpoint URL containing /<bucket>.')
  }

  return {
    endpoint: `${parsed.protocol}//${parsed.host}`,
    bucket,
  }
}

function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim()
  let endpoint = process.env.R2_ENDPOINT?.trim()
  let bucket = process.env.R2_BUCKET?.trim()

  const legacy = process.env.CLOUDFLARE_R2?.trim()
  if ((!endpoint || !bucket) && legacy) {
    const legacyConfig = parseLegacyEndpointAndBucket(legacy)
    endpoint ||= legacyConfig.endpoint
    bucket ||= legacyConfig.bucket
  }

  if (!endpoint && accountId) {
    endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  }

  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim()
    || process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim()

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error(
      'Missing R2 env vars. Required: R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL and either R2_ENDPOINT or R2_ACCOUNT_ID. Legacy CLOUDFLARE_R2 endpoint/bucket fallback is supported.'
    )
  }

  return {
    endpoint: normalizeUrl(endpoint),
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: normalizeUrl(publicBaseUrl),
  }
}

function extensionForMime(contentType: string) {
  switch (contentType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'bin'
  }
}

function buildClient(config: R2Config) {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export async function createBoardAssetUploadUrl(params: {
  boardId: string
  kind: UploadKind
  contentType: string
}) {
  const config = getR2Config()
  const client = buildClient(config)
  const ext = extensionForMime(params.contentType)
  const key = `boards/${params.boardId}/${params.kind}/${randomUUID()}.${ext}`

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: params.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 })

  return {
    key,
    uploadUrl,
    publicUrl: `${config.publicBaseUrl}/${key}`,
  }
}

export async function uploadBoardAsset(params: {
  boardId: string
  kind: UploadKind
  contentType: string
  body: Uint8Array
}) {
  const config = getR2Config()
  const client = buildClient(config)
  const ext = extensionForMime(params.contentType)
  const key = `boards/${params.boardId}/${params.kind}/${randomUUID()}.${ext}`

  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: params.body,
    ContentType: params.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  return {
    key,
    publicUrl: `${config.publicBaseUrl}/${key}`,
  }
}
