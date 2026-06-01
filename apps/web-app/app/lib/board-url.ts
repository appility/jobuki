export function boardUrl(slug: string, customDomain: string | null): string {
  const protocol = process.env.ROOT_PROTOCOL ?? 'https'
  const rootDomain = process.env.ROOT_DOMAIN ?? 'jobuki.co'
  const isProd = process.env.NODE_ENV === 'production'
  const port = process.env.ROOT_PORT ?? (isProd ? '' : (process.env.PORT ?? '3000'))

  const domain = customDomain ?? `${slug}.${rootDomain}`
  const isStandardPort =
    !port ||
    (protocol === 'https' && port === '443') ||
    (protocol === 'http'  && port === '80')

  return isStandardPort
    ? `${protocol}://${domain}`
    : `${protocol}://${domain}:${port}`
}
