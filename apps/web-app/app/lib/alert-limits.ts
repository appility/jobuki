const DEFAULT_MAX_ALERTS_PER_USER = 5

export function getMaxAlertsPerUser() {
  const raw = process.env.ALERTS_MAX_PER_USER
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed)
  }
  return DEFAULT_MAX_ALERTS_PER_USER
}
