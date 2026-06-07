import type { BoardTheme } from '@jobuki/types'
import { DEFAULT_THEME } from '@jobuki/types'
import { readableFg, isValidHex } from './color'

/**
 * Converts a BoardTheme into a CSS custom properties string.
 * Injected as a <style> tag on every public board page.
 */
export function themeToCSS(theme: BoardTheme, scope = ':root'): string {
  const buttonRadius =
    theme.buttonStyle === 'pill'  ? '9999px' :
    theme.buttonStyle === 'sharp' ? theme.radiusSm :
    theme.radiusLg

  const headerBg =
    theme.headerStyle === 'coloured' ? theme.colorPrimary :
    theme.headerStyle === 'bold'     ? theme.colorTextPrimary :
    theme.colorSurface

  const headerText   = theme.headerStyle === 'minimal' ? theme.colorTextPrimary   : '#ffffff'
  const headerMuted  = theme.headerStyle === 'minimal' ? theme.colorTextSecondary : 'rgba(255,255,255,0.7)'
  const headerBorder = theme.headerStyle === 'minimal' ? theme.colorBorder        : 'transparent'

  return `
${scope} {
  --color-primary:        ${theme.colorPrimary};
  --color-primary-fg:     ${theme.colorPrimaryFg};
  --color-accent:         ${theme.colorAccent};
  --color-accent-fg:      ${theme.colorAccentFg};
  --color-background:     ${theme.colorBackground};
  --color-surface:        ${theme.colorSurface};
  --color-surface-subtle: ${theme.colorSurfaceSubtle};
  --color-text-primary:   ${theme.colorTextPrimary};
  --color-text-secondary: ${theme.colorTextSecondary};
  --color-text-muted:     ${theme.colorTextMuted};
  --color-border:         ${theme.colorBorder};
  --color-border-strong:  ${theme.colorBorderStrong};
  --font-display: ${theme.fontDisplay};
  --font-body:    ${theme.fontBody};
  --radius-sm:  ${theme.radiusSm};
  --radius-md:  ${theme.radiusMd};
  --radius-lg:  ${theme.radiusLg};
  --radius-xl:  ${theme.radiusXl};
  --radius-2xl: ${theme.radius2xl};
  --btn-radius:            ${buttonRadius};
  --job-card-hover-border: ${theme.colorPrimary};
  --input-focus-border:    ${theme.colorPrimary};
  --header-bg:     ${headerBg};
  --header-text:   ${headerText};
  --header-muted:  ${headerMuted};
  --header-border: ${headerBorder};
  --board-ambient-primary: ${theme.boardAmbientPrimary};
  --board-ambient-accent: ${theme.boardAmbientAccent};
  --board-hero-tint: ${theme.boardHeroTint};
  --board-card-tint: ${theme.boardCardTint};
  --board-header-surface-mix: ${theme.boardHeaderSurfaceMix};
  --board-header-blur: ${theme.boardHeaderBlur};
}`.trim()
}

export function resolveTheme(partial: Partial<BoardTheme>): BoardTheme {
  const merged = { ...DEFAULT_THEME, ...partial }

  // Guardrail: always keep button foregrounds readable even if manual values are poor.
  const safePrimaryFg = isValidHex(merged.colorPrimary) ? readableFg(merged.colorPrimary) : merged.colorPrimaryFg
  const safeAccentFg = isValidHex(merged.colorAccent) ? readableFg(merged.colorAccent) : merged.colorAccentFg

  return {
    ...merged,
    colorPrimaryFg: safePrimaryFg,
    colorAccentFg: safeAccentFg,
  }
}
