/**
 * Generate Google Fonts import URL based on configured fonts.
 * Used globally across public board pages.
 * 
 * Handles both formats:
 * - Full stack: "'Plus Jakarta Sans', sans-serif"
 * - Simple name: "Plus Jakarta Sans"
 */
export function getGoogleFontsImport(fontDisplay?: string, fontBody?: string): string {
  // Extract font name from full stack (e.g., "'Plus Jakarta Sans', sans-serif" → "Plus Jakarta Sans")
  const extractFontName = (input: string): string => {
    if (!input) return ''
    // Remove quotes and extract first font name
    const match = input.match(/['"]?([^'",]+)['"]?/)
    return match?.[1]?.trim() || ''
  }

  const displayName = extractFontName(fontDisplay || 'Unbounded')
  const bodyName = extractFontName(fontBody || 'Plus Jakarta Sans')

  // Map font names to Google Font URLs
  const fontMap: Record<string, string> = {
    'Unbounded': 'Unbounded:wght@700;800;900',
    'Plus Jakarta Sans': 'Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,700',
    'DM Sans': 'DM+Sans:wght@400;500;600;700',
    'Inter': 'Inter:wght@400;500;600;700;800',
    'IBM Plex Sans': 'IBM+Plex+Sans:wght@400;500;600;700',
    'JetBrains Mono': 'JetBrains+Mono:wght@400;500;600;700',
    'Sora': 'Sora:wght@400;500;600;700;800',
    'Space Grotesk': 'Space+Grotesk:wght@400;500;600;700',
    'Manrope': 'Manrope:wght@400;500;600;700;800',
  }

  const displayFont = fontMap[displayName] || fontMap['Unbounded']
  const bodyFont = fontMap[bodyName] || fontMap['Plus Jakarta Sans']

  return `@import url('https://fonts.googleapis.com/css2?family=${displayFont}&family=${bodyFont}&display=swap');`
}
