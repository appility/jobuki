import type { BoardTheme, JobBoardCssVariables } from '@jobuki/types'
import { DEFAULT_THEME } from '@jobuki/types'
import { readableFg, isValidHex } from './color'

/**
 * Converts a BoardTheme into a CSS custom properties string.
 * Injected as a <style> tag on every public board page.
 */
export function themeToCSS(theme: BoardTheme, scope = ':root', cssVariables?: JobBoardCssVariables): string {
  const pickCssVar = (value: string | undefined, fallback: string) => {
    const safe = (value ?? '').trim()
    return safe.length > 0 ? safe : fallback
  }

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

  const pillActiveBg = pickCssVar(cssVariables?.pillActiveBg, theme.colorTextPrimary)
  const pillActiveFg = pickCssVar(cssVariables?.pillActiveFg, theme.colorBackground)
  const pillActiveBorder = pickCssVar(cssVariables?.pillActiveBorder, theme.colorTextPrimary)
  const pillInactiveBg = pickCssVar(cssVariables?.pillInactiveBg, theme.colorSurface)
  const pillInactiveFg = pickCssVar(cssVariables?.pillInactiveFg, theme.colorTextSecondary)
  const pillInactiveBorder = pickCssVar(cssVariables?.pillInactiveBorder, theme.colorBorder)
  const pillDisabledOpacity = pickCssVar(cssVariables?.pillDisabledOpacity, '0.5')

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
  --color-surface-inverse: ${theme.colorTextPrimary};
  --color-text-inverse:    ${theme.colorSurface};
  --color-border-inverse:  color-mix(in srgb, ${theme.colorSurface} 20%, transparent);
  --color-panel-strong:    color-mix(in srgb, ${theme.colorTextPrimary} 92%, ${theme.colorBackground} 8%);
  --color-panel-strong-fg: ${theme.colorSurface};
  --color-badge-remote-bg: color-mix(in srgb, ${theme.colorPrimary} 14%, ${theme.colorSurface} 86%);
  --color-badge-remote-fg: ${theme.colorPrimary};
  --color-badge-hybrid-bg: color-mix(in srgb, ${theme.colorAccent} 14%, ${theme.colorSurface} 86%);
  --color-badge-hybrid-fg: ${theme.colorAccent};
  --color-badge-onsite-bg: color-mix(in srgb, ${theme.colorTextSecondary} 16%, ${theme.colorSurface} 84%);
  --color-badge-onsite-fg: ${theme.colorTextPrimary};
  --color-badge-category-1-bg: color-mix(in srgb, ${theme.colorPrimary} 14%, ${theme.colorSurface} 86%);
  --color-badge-category-1-fg: ${theme.colorPrimary};
  --color-badge-category-2-bg: color-mix(in srgb, ${theme.colorAccent} 14%, ${theme.colorSurface} 86%);
  --color-badge-category-2-fg: ${theme.colorAccent};
  --color-badge-category-3-bg: color-mix(in srgb, ${theme.colorTextSecondary} 14%, ${theme.colorSurface} 86%);
  --color-badge-category-3-fg: ${theme.colorTextPrimary};
  --color-badge-category-4-bg: color-mix(in srgb, ${theme.colorPrimary} 10%, ${theme.colorSurfaceSubtle} 90%);
  --color-badge-category-4-fg: ${theme.colorTextPrimary};
  --color-badge-category-5-bg: color-mix(in srgb, ${theme.colorAccent} 10%, ${theme.colorSurfaceSubtle} 90%);
  --color-badge-category-5-fg: ${theme.colorTextSecondary};
  --pill-active-bg:        ${pillActiveBg};
  --pill-active-fg:        ${pillActiveFg};
  --pill-active-border:    ${pillActiveBorder};
  --pill-inactive-bg:      ${pillInactiveBg};
  --pill-inactive-fg:      ${pillInactiveFg};
  --pill-inactive-border:  ${pillInactiveBorder};
  --pill-disabled-opacity: ${pillDisabledOpacity};
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
