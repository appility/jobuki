// ── Conversions ───────────────────────────────────────────────────────

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Relative luminance for WCAG contrast
function luminance(hex: string) {
  const c = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map(v => {
    const n = parseInt(v, 16) / 255
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

// Returns #ffffff or #1C1917 depending on which has better contrast
export function readableFg(bg: string): string {
  const l = luminance(bg)
  const onWhite = (l + 0.05) / (0.05)
  const onDark  = (0.0677 + 0.05) / (l + 0.05) // contrast on #1C1917
  return onWhite > onDark ? '#ffffff' : '#1C1917'
}

// ── Palette generation ────────────────────────────────────────────────

export interface AccentSuggestion {
  label: string
  hex: string
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

export function suggestAccents(primaryHex: string): AccentSuggestion[] {
  if (!isValidHex(primaryHex)) return []
  const [h, s, l] = hexToHsl(primaryHex)

  // Clamp saturation for accent — we want vibrant but not overwhelming
  const accentS = Math.min(Math.max(s, 65), 90)
  // Keep lightness in a "punchy" range
  const accentL = l > 60 ? 42 : l < 25 ? 55 : 50

  return [
    {
      label: 'Complementary',
      hex: hslToHex(h + 180, accentS, accentL),
    },
    {
      label: 'Split complement',
      hex: hslToHex(h + 150, accentS, accentL),
    },
    {
      label: 'Triadic',
      hex: hslToHex(h + 120, accentS, accentL),
    },
    {
      label: 'Warm pop',
      // For cool hues (180-300) → warm orange/amber; for warm hues → teal/cyan
      hex: h >= 150 && h <= 300
        ? hslToHex(30, 90, 52)   // amber
        : hslToHex(185, 80, 42), // teal
    },
  ]
}
