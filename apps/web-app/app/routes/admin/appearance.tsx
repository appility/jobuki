import { useState } from 'react'
import { useLoaderData, useActionData, Form, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveTheme, themeToCSS } from '../../lib/theme'
import { suggestAccents, readableFg, isValidHex } from '../../lib/color'
import {
  resolveJobBoardThemeConfig,
  type BoardTheme,
  type HeaderStyle,
  type ButtonStyle,
  type JobBoardHeaderStyle,
  type JobBoardThemePreset,
  type JobBoardEmptyStateIcon,
  type JobBoardThemeConfig,
} from '@jobuki/types'

// ── Loader ────────────────────────────────────────────────────────────
export async function loader({ params }: LoaderFunctionArgs) {
  const db = getDb()
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, params.id!),
  })
  if (!board) throw new Response('Board not found', { status: 404 })
  return {
    board,
    theme: resolveTheme(board.theme ?? {}),
    boardConfig: resolveJobBoardThemeConfig(board.boardConfig, {
      boardName: board.name,
      tagline: board.introText ?? undefined,
      logoUrl: board.logoUrl ?? undefined,
      headerImageUrl: board.heroImageUrl ?? undefined,
      brandColor: (board.theme as any)?.colorPrimary,
      accentColor: (board.theme as any)?.colorAccent,
      backgroundColor: (board.theme as any)?.colorBackground,
    }),
  }
}

// ── Action ────────────────────────────────────────────────────────────
export async function action({ request, params }: ActionFunctionArgs) {
  const db = getDb()
  const form = await request.formData()
  const intent = form.get('intent') as string

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, params.id!),
  })
  if (!board) throw new Response('Board not found', { status: 404 })

  // ── Save theme + content ────────────────────────────────────────────
  if (intent === 'save') {
    const parseBool = (value: FormDataEntryValue | null) => value === 'true' || value === 'on'

    const theme: BoardTheme = {
      ...resolveTheme(board.theme ?? {}),
      colorPrimary:       form.get('colorPrimary') as string,
      colorPrimaryFg:     form.get('colorPrimaryFg') as string,
      colorAccent:        form.get('colorAccent') as string,
      colorAccentFg:      form.get('colorAccentFg') as string,
      colorBackground:    form.get('colorBackground') as string,
      colorSurface:       form.get('colorSurface') as string,
      colorSurfaceSubtle: form.get('colorSurfaceSubtle') as string,
      colorTextPrimary:   form.get('colorTextPrimary') as string,
      colorTextSecondary: form.get('colorTextSecondary') as string,
      colorTextMuted:     form.get('colorTextMuted') as string,
      colorBorder:        form.get('colorBorder') as string,
      colorBorderStrong:  form.get('colorBorderStrong') as string,
      fontDisplay:        form.get('fontDisplay') as string,
      fontBody:           form.get('fontBody') as string,
      radiusSm:           form.get('radiusSm') as string,
      radiusMd:           form.get('radiusMd') as string,
      radiusLg:           form.get('radiusLg') as string,
      radiusXl:           form.get('radiusXl') as string,
      radius2xl:          form.get('radius2xl') as string,
      headerStyle:        form.get('headerStyle') as HeaderStyle,
      buttonStyle:        form.get('buttonStyle') as ButtonStyle,
      boardMaxWidth:      form.get('boardMaxWidth') as string,
    }

    const boardConfig: JobBoardThemeConfig = resolveJobBoardThemeConfig(
      {
        boardName: (form.get('boardConfigBoardName') as string)?.trim(),
        tagline: (form.get('boardConfigTagline') as string)?.trim(),
        logoUrl: (form.get('boardConfigLogoUrl') as string)?.trim(),
        headerImageUrl: (form.get('boardConfigHeaderImageUrl') as string)?.trim(),
        brandColor: (form.get('boardConfigBrandColor') as string)?.trim(),
        accentColor: (form.get('boardConfigAccentColor') as string)?.trim(),
        backgroundColor: (form.get('boardConfigBackgroundColor') as string)?.trim(),
        headerStyle: form.get('boardConfigHeaderStyle') as JobBoardHeaderStyle,
        themePreset: form.get('boardConfigThemePreset') as JobBoardThemePreset,
        showSearch: parseBool(form.get('boardConfigShowSearch')),
        showFilters: parseBool(form.get('boardConfigShowFilters')),
        emptyState: {
          icon: form.get('boardConfigEmptyStateIcon') as JobBoardEmptyStateIcon,
          title: (form.get('boardConfigEmptyStateTitle') as string)?.trim(),
          description: (form.get('boardConfigEmptyStateDescription') as string)?.trim(),
          ctaLabel: (form.get('boardConfigEmptyStateCtaLabel') as string)?.trim(),
          ctaUrl: (form.get('boardConfigEmptyStateCtaUrl') as string)?.trim(),
        },
        footer: {
          showPoweredBy: parseBool(form.get('boardConfigFooterShowPoweredBy')),
          companyWebsiteUrl: (form.get('boardConfigFooterCompanyWebsiteUrl') as string)?.trim(),
        },
      },
      {
        boardName: board.name,
        tagline: form.get('introText') as string,
        logoUrl: (form.get('logoUrl') as string)?.trim(),
        headerImageUrl: (form.get('heroImageUrl') as string)?.trim(),
        brandColor: theme.colorPrimary,
        accentColor: theme.colorAccent,
        backgroundColor: theme.colorBackground,
      }
    )

    await db
      .update(boards)
      .set({
        name:         form.get('name') as string,
        logoUrl:      (form.get('logoUrl') as string).trim() || null,
        heroImageUrl: (form.get('heroImageUrl') as string).trim() || null,
        introText:    form.get('introText') as string,
        footerText:   form.get('footerText') as string,
        theme,
        boardConfig,
        updatedAt:    new Date(),
      })
      .where(eq(boards.id, params.id!))

    return { ok: true, message: 'Appearance saved.' }
  }

  // ── Add / update custom domain ──────────────────────────────────────
  if (intent === 'save_domain') {
    const newDomain = (form.get('customDomain') as string).trim().toLowerCase()

    // Clear domain
    if (!newDomain) {
      if (board.railwayDomainId) {
        await removeCustomDomain(board.railwayDomainId).catch(() => null)
      }
      await db
        .update(boards)
        .set({ customDomain: null, railwayDomainId: null, customDomainStatus: null, updatedAt: new Date() })
        .where(eq(boards.id, params.id!))
      return { ok: true, message: 'Custom domain removed.' }
    }

    // Validate format
    if (!isValidDomain(newDomain)) {
      return { ok: false, error: 'Invalid domain format. Use e.g. jobs.acme.com — no https:// or trailing slash.' }
    }

    // Same domain — no change needed
    if (newDomain === board.customDomain) {
      return { ok: true, message: 'Domain unchanged.' }
    }

    // Remove old domain from Railway if switching
    if (board.railwayDomainId && board.customDomain !== newDomain) {
      await removeCustomDomain(board.railwayDomainId).catch(() => null)
    }

    try {
      // Add new domain to Railway — auto-provisions SSL once DNS resolves
      const result = await addCustomDomain(newDomain)

      await db
        .update(boards)
        .set({
          customDomain:       newDomain,
          railwayDomainId:    result.id,
          customDomainStatus: 'pending_dns',
          updatedAt:          new Date(),
        })
        .where(eq(boards.id, params.id!))

      return {
        ok: true,
        message: 'Domain added. Now add a CNAME record in your DNS pointing to your Railway URL. SSL will provision automatically once DNS resolves.',
        domainAdded: true,
      }
    } catch (err: any) {
      return { ok: false, error: `Railway error: ${err.message}` }
    }
  }

  return { ok: false, error: 'Unknown intent.' }
}

// ── Component ─────────────────────────────────────────────────────────
const FONT_OPTIONS = [
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'DM Sans',           value: "'DM Sans', sans-serif" },
  { label: 'Inter',             value: "'Inter', sans-serif" },
  { label: 'Geist',             value: "'Geist', sans-serif" },
  { label: 'Fraunces',          value: "'Fraunces', serif" },
  { label: 'Lora',              value: "'Lora', serif" },
]

const SWATCH_PRESETS = [
  '#3730A3', '#0D9488', '#D97706', '#DC2626', '#16A34A',
  '#7C3AED', '#DB2777', '#0284C7', '#1C1917', '#374151',
]

export default function AppearancePage() {
  const { board, theme, boardConfig } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSaving = navigation.state === 'submitting'

  // Local state for live preview
  const [t, setT] = useState(theme)
  const [logoUrl, setLogoUrl]           = useState(board.logoUrl ?? '')
  const [heroImageUrl, setHeroImageUrl] = useState(board.heroImageUrl ?? '')
  const [introText, setIntroText]       = useState(board.introText ?? '')
  const [configBoardName, setConfigBoardName] = useState(boardConfig.boardName)
  const [configTagline, setConfigTagline] = useState(boardConfig.tagline ?? '')
  const [configLogoUrl, setConfigLogoUrl] = useState(boardConfig.logoUrl ?? '')
  const [configHeaderImageUrl, setConfigHeaderImageUrl] = useState(boardConfig.headerImageUrl ?? '')
  const [configBrandColor, setConfigBrandColor] = useState(boardConfig.brandColor)
  const [configAccentColor, setConfigAccentColor] = useState(boardConfig.accentColor ?? '')
  const [configBackgroundColor, setConfigBackgroundColor] = useState(boardConfig.backgroundColor ?? '')
  const [configHeaderStyle, setConfigHeaderStyle] = useState<JobBoardHeaderStyle>(boardConfig.headerStyle)
  const [configThemePreset, setConfigThemePreset] = useState<JobBoardThemePreset>(boardConfig.themePreset)
  const [configShowSearch, setConfigShowSearch] = useState(boardConfig.showSearch)
  const [configShowFilters, setConfigShowFilters] = useState(boardConfig.showFilters)
  const [configEmptyStateIcon, setConfigEmptyStateIcon] = useState<JobBoardEmptyStateIcon>(boardConfig.emptyState.icon ?? 'search')
  const [configEmptyStateTitle, setConfigEmptyStateTitle] = useState(boardConfig.emptyState.title)
  const [configEmptyStateDescription, setConfigEmptyStateDescription] = useState(boardConfig.emptyState.description)
  const [configEmptyStateCtaLabel, setConfigEmptyStateCtaLabel] = useState(boardConfig.emptyState.ctaLabel ?? '')
  const [configEmptyStateCtaUrl, setConfigEmptyStateCtaUrl] = useState(boardConfig.emptyState.ctaUrl ?? '')
  const [configFooterShowPoweredBy, setConfigFooterShowPoweredBy] = useState(boardConfig.footer.showPoweredBy)
  const [configFooterCompanyWebsiteUrl, setConfigFooterCompanyWebsiteUrl] = useState(boardConfig.footer.companyWebsiteUrl ?? '')

  const updateToken = (key: keyof BoardTheme, value: string) =>
    setT(prev => ({ ...prev, [key]: value }))

  // Scoped to .board-preview so it never bleeds into the admin shell
  const previewCSS = themeToCSS(t, '.board-preview')

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Left: settings panel ── */}
      <div className="w-80 shrink-0 flex flex-col border-r overflow-hidden"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>

        {/* Header */}
        <div className="px-6 py-5 border-b shrink-0"
          style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-extrabold m-0"
            style={{ color: 'var(--color-text-primary)' }}>Appearance</h2>
          <p className="text-xs mt-1 m-0"
            style={{ color: 'var(--color-text-secondary)' }}>
            {board.name}
          </p>
        </div>

        {/* Scrollable settings */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Status feedback ── */}
          {actionData && (
            <div className={`mb-5 px-4 py-3 rounded-lg text-xs font-medium border`}
              style={{
                backgroundColor: actionData.ok ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                color: actionData.ok ? 'var(--color-success)' : 'var(--color-danger)',
                borderColor: actionData.ok ? 'var(--color-success)' : 'var(--color-danger)',
              }}>
              {actionData.ok ? '✓ ' : '✗ '}
              {actionData.message ?? actionData.error}
            </div>
          )}

          {/* ── Theme form ── */}
          <Form method="post">
            <input type="hidden" name="intent" value="save" />
            <input type="hidden" name="name" value={board.name} />
            <input type="hidden" name="logoUrl" value={logoUrl} />
            <input type="hidden" name="heroImageUrl" value={heroImageUrl} />
            <input type="hidden" name="introText" value={introText} />
            <input type="hidden" name="footerText" value={board.footerText ?? ''} />
            <input type="hidden" name="boardConfigBoardName" value={configBoardName} />
            <input type="hidden" name="boardConfigTagline" value={configTagline} />
            <input type="hidden" name="boardConfigLogoUrl" value={configLogoUrl} />
            <input type="hidden" name="boardConfigHeaderImageUrl" value={configHeaderImageUrl} />
            <input type="hidden" name="boardConfigBrandColor" value={configBrandColor} />
            <input type="hidden" name="boardConfigAccentColor" value={configAccentColor} />
            <input type="hidden" name="boardConfigBackgroundColor" value={configBackgroundColor} />
            <input type="hidden" name="boardConfigHeaderStyle" value={configHeaderStyle} />
            <input type="hidden" name="boardConfigThemePreset" value={configThemePreset} />
            <input type="hidden" name="boardConfigShowSearch" value={configShowSearch ? 'true' : 'false'} />
            <input type="hidden" name="boardConfigShowFilters" value={configShowFilters ? 'true' : 'false'} />
            <input type="hidden" name="boardConfigEmptyStateIcon" value={configEmptyStateIcon} />
            <input type="hidden" name="boardConfigEmptyStateTitle" value={configEmptyStateTitle} />
            <input type="hidden" name="boardConfigEmptyStateDescription" value={configEmptyStateDescription} />
            <input type="hidden" name="boardConfigEmptyStateCtaLabel" value={configEmptyStateCtaLabel} />
            <input type="hidden" name="boardConfigEmptyStateCtaUrl" value={configEmptyStateCtaUrl} />
            <input type="hidden" name="boardConfigFooterShowPoweredBy" value={configFooterShowPoweredBy ? 'true' : 'false'} />
            <input type="hidden" name="boardConfigFooterCompanyWebsiteUrl" value={configFooterCompanyWebsiteUrl} />
            {/* Pass all theme tokens as hidden inputs */}
            {(Object.entries(t) as [keyof BoardTheme, string][]).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}

            {/* Primary colour */}
            <Section label="PRIMARY COLOUR">
              <div className="flex gap-1.5 flex-wrap mb-2">
                {SWATCH_PRESETS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => {
                      updateToken('colorPrimary', c)
                      updateToken('colorPrimaryFg', readableFg(c))
                    }}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer shrink-0 transition-all"
                    style={{
                      backgroundColor: c,
                      outline: t.colorPrimary === c ? `3px solid ${c}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={t.colorPrimary}
                  onChange={e => {
                    updateToken('colorPrimary', e.target.value)
                    updateToken('colorPrimaryFg', readableFg(e.target.value))
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer border p-0.5"
                  style={{ borderColor: 'var(--color-border)' }}
                />
                <input value={t.colorPrimary}
                  onChange={e => {
                    updateToken('colorPrimary', e.target.value)
                    if (isValidHex(e.target.value)) updateToken('colorPrimaryFg', readableFg(e.target.value))
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </Section>

            {/* Accent colour + smart suggestions */}
            <Section label="ACCENT COLOUR">
              {/* Suggestions based on primary */}
              {(() => {
                const suggestions = suggestAccents(t.colorPrimary)
                return suggestions.length > 0 ? (
                  <div className="mb-2">
                    <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Suggested from your primary:
                    </p>
                    <div className="flex gap-1.5">
                      {suggestions.map(s => (
                        <button
                          key={s.hex} type="button"
                          title={s.label}
                          onClick={() => {
                            updateToken('colorAccent', s.hex)
                            updateToken('colorAccentFg', readableFg(s.hex))
                          }}
                          className="flex-1 rounded-lg transition-all border-0 cursor-pointer"
                          style={{
                            height: 28,
                            backgroundColor: s.hex,
                            outline: t.colorAccent === s.hex ? `3px solid ${s.hex}` : 'none',
                            outlineOffset: 2,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5 mt-0.5">
                      {suggestions.map(s => (
                        <span key={s.hex} className="flex-1 text-center"
                          style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}
              <div className="flex items-center gap-2">
                <input type="color" value={t.colorAccent}
                  onChange={e => {
                    updateToken('colorAccent', e.target.value)
                    updateToken('colorAccentFg', readableFg(e.target.value))
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer border p-0.5"
                  style={{ borderColor: 'var(--color-border)' }}
                />
                <input value={t.colorAccent}
                  onChange={e => {
                    updateToken('colorAccent', e.target.value)
                    if (isValidHex(e.target.value)) updateToken('colorAccentFg', readableFg(e.target.value))
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </Section>

            {/* Background */}
            <Section label="BACKGROUND">
              <div className="flex items-center gap-2">
                <input type="color" value={t.colorBackground}
                  onChange={e => updateToken('colorBackground', e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border p-0.5"
                  style={{ borderColor: 'var(--color-border)' }}
                />
                <input value={t.colorBackground}
                  onChange={e => updateToken('colorBackground', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </Section>

            {/* Header style */}
            <Section label="HEADER STYLE">
              <div className="flex gap-2">
                {(['minimal', 'bold', 'coloured'] as HeaderStyle[]).map(s => (
                  <button key={s} type="button"
                    onClick={() => updateToken('headerStyle', s)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer border capitalize transition-all"
                    style={{
                      backgroundColor: t.headerStyle === s ? t.colorPrimary + '18' : 'var(--color-surface-subtle)',
                      borderColor: t.headerStyle === s ? t.colorPrimary : 'var(--color-border)',
                      color: t.headerStyle === s ? t.colorPrimary : 'var(--color-text-muted)',
                    }}
                  >{s}</button>
                ))}
              </div>
            </Section>

            {/* Button style */}
            <Section label="BUTTON STYLE">
              <div className="flex gap-2">
                {(['rounded', 'pill', 'sharp'] as ButtonStyle[]).map(s => (
                  <button key={s} type="button"
                    onClick={() => updateToken('buttonStyle', s)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer border capitalize transition-all"
                    style={{
                      backgroundColor: t.buttonStyle === s ? t.colorPrimary + '18' : 'var(--color-surface-subtle)',
                      borderColor: t.buttonStyle === s ? t.colorPrimary : 'var(--color-border)',
                      color: t.buttonStyle === s ? t.colorPrimary : 'var(--color-text-muted)',
                    }}
                  >{s}</button>
                ))}
              </div>
            </Section>

            {/* Font */}
            <Section label="FONT">
              <select
                value={t.fontBody}
                onChange={e => {
                  updateToken('fontBody', e.target.value)
                  updateToken('fontDisplay', e.target.value)
                }}
                className="w-full px-2.5 py-2 rounded-lg text-xs border"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Section>

            {/* Board max width */}
            <Section label="BOARD WIDTH">
              <div className="flex gap-2">
                {['680px', '800px', '960px', '1100px'].map(w => (
                  <button key={w} type="button"
                    onClick={() => updateToken('boardMaxWidth', w)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all"
                    style={{
                      backgroundColor: t.boardMaxWidth === w ? t.colorPrimary + '18' : 'var(--color-surface-subtle)',
                      borderColor: t.boardMaxWidth === w ? t.colorPrimary : 'var(--color-border)',
                      color: t.boardMaxWidth === w ? t.colorPrimary : 'var(--color-text-muted)',
                    }}
                  >{w.replace('px', '')}</button>
                ))}
              </div>
            </Section>

            {/* Logo */}
            <Section label="LOGO URL">
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Paste an image URL. Best size: 400×400px, PNG/SVG.
              </p>
              <div className="flex items-center gap-2">
                {logoUrl && (
                  <img src={logoUrl} alt="Logo preview"
                    className="w-9 h-9 rounded-lg object-contain shrink-0"
                    style={{ border: '1px solid var(--color-border)' }}
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <input
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="https://…"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </Section>

            {/* Hero image */}
            <Section label="HERO BACKGROUND">
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Paste an image URL. Best size: 1600×480px, JPEG/WebP, under 400KB.
              </p>
              <input
                value={heroImageUrl}
                onChange={e => setHeroImageUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                placeholder="https://…"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
              {heroImageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden"
                  style={{ height: 60, backgroundImage: `url(${heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--color-border)' }}
                />
              )}
            </Section>

            {/* Intro text */}
            <Section label="INTRO TEXT">
              <textarea
                value={introText}
                onChange={e => setIntroText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-xs border leading-relaxed resize-y"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
            </Section>

            <Section label="BOARD CONFIG NAME & TAGLINE">
              <input
                value={configBoardName}
                onChange={e => setConfigBoardName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border mb-2"
                placeholder="Public board title"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
              <input
                value={configTagline}
                onChange={e => setConfigTagline(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                placeholder="Short header tagline"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
            </Section>

            <Section label="CONFIG BRAND COLOURS">
              <div className="grid grid-cols-1 gap-2">
                <input
                  value={configBrandColor}
                  onChange={e => setConfigBrandColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="#3730A3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={configAccentColor}
                  onChange={e => setConfigAccentColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="#F97316"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={configBackgroundColor}
                  onChange={e => setConfigBackgroundColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="#FAFAF8"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </Section>

            <Section label="CONFIG HEADER & PRESET">
              <select
                value={configHeaderStyle}
                onChange={e => setConfigHeaderStyle(e.target.value as JobBoardHeaderStyle)}
                className="w-full px-2.5 py-2 rounded-lg text-xs border mb-2"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              >
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
                <option value="image">Image</option>
              </select>
              <select
                value={configThemePreset}
                onChange={e => setConfigThemePreset(e.target.value as JobBoardThemePreset)}
                className="w-full px-2.5 py-2 rounded-lg text-xs border"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              >
                <option value="minimal">Minimal</option>
                <option value="startup">Startup</option>
                <option value="editorial">Editorial</option>
                <option value="bold">Bold</option>
                <option value="dark">Dark</option>
              </select>
            </Section>

            <Section label="CONFIG LOGO & HEADER IMAGE URL">
              <input
                value={configLogoUrl}
                onChange={e => setConfigLogoUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border mb-2"
                placeholder="https://logo-url"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
              <input
                value={configHeaderImageUrl}
                onChange={e => setConfigHeaderImageUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                placeholder="https://header-image-url"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
            </Section>

            <Section label="CONFIG TOGGLES">
              <label className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={configShowSearch} onChange={e => setConfigShowSearch(e.target.checked)} />
                Show search
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={configShowFilters} onChange={e => setConfigShowFilters(e.target.checked)} />
                Show filters
              </label>
            </Section>

            <Section label="EMPTY STATE">
              <select
                value={configEmptyStateIcon}
                onChange={e => setConfigEmptyStateIcon(e.target.value as JobBoardEmptyStateIcon)}
                className="w-full px-2.5 py-2 rounded-lg text-xs border mb-2"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              >
                <option value="search">Search</option>
                <option value="briefcase">Briefcase</option>
                <option value="sparkle">Sparkle</option>
                <option value="inbox">Inbox</option>
              </select>
              <input
                value={configEmptyStateTitle}
                onChange={e => setConfigEmptyStateTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border mb-2"
                placeholder="Empty state title"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
              <textarea
                value={configEmptyStateDescription}
                onChange={e => setConfigEmptyStateDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl text-xs border leading-relaxed resize-y mb-2"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
              />
              <input
                value={configEmptyStateCtaLabel}
                onChange={e => setConfigEmptyStateCtaLabel(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border mb-2"
                placeholder="CTA label (optional)"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
              <input
                value={configEmptyStateCtaUrl}
                onChange={e => setConfigEmptyStateCtaUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                placeholder="CTA URL (optional)"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
            </Section>

            <Section label="FOOTER CONFIG">
              <label className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={configFooterShowPoweredBy}
                  onChange={e => setConfigFooterShowPoweredBy(e.target.checked)}
                />
                Show powered by
              </label>
              <input
                value={configFooterCompanyWebsiteUrl}
                onChange={e => setConfigFooterCompanyWebsiteUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                placeholder="Company website URL (optional)"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              />
            </Section>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border-0 cursor-pointer transition-all mb-2"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)', opacity: isSaving ? 0.7 : 1 }}
            >
              {isSaving ? 'Saving…' : 'Save appearance'}
            </button>
          </Form>

          {/* Domain link */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <a href={`/dashboard/boards/${board.id}/domain`}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold no-underline transition-all"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-surface-subtle)',
              }}>
              <span>Manage domains</span>
              <span>→</span>
            </a>
          </div>

        </div>
      </div>

      {/* ── Right: live preview ── */}
      <div className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: '#E8E6E1' }}>

        {/* Preview bar */}
        <div className="px-5 py-3 border-b flex items-center justify-between shrink-0"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
            <span className="text-xs font-semibold tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}>LIVE PREVIEW</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Changes reflect instantly
          </span>
        </div>

        {/* Preview frame — board-preview class is the CSS scope boundary */}
        <div className="board-preview flex-1 overflow-auto p-6">
          <style dangerouslySetInnerHTML={{ __html: previewCSS }} />

          <div className="mx-auto rounded-2xl overflow-hidden"
            style={{
              maxWidth: '760px',
              backgroundColor: t.colorBackground,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}>

            {/* Preview header */}
            <div className="px-7 py-6 border-b"
              style={{
                backgroundColor:
                  t.headerStyle === 'coloured' ? t.colorPrimary :
                  t.headerStyle === 'bold'     ? t.colorTextPrimary :
                  t.colorSurface,
                borderColor: t.headerStyle === 'minimal' ? t.colorBorder : 'transparent',
              }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl"
                  style={{ backgroundColor: t.colorPrimary }} />
                <div>
                  <div className="text-sm font-extrabold"
                    style={{
                      fontFamily: t.fontDisplay,
                      color: t.headerStyle === 'minimal' ? t.colorTextPrimary : '#fff',
                    }}>
                    {board.name}
                  </div>
                  <div className="text-xs"
                    style={{ color: t.headerStyle === 'minimal' ? t.colorTextMuted : 'rgba(255,255,255,0.65)' }}>
                    14 open roles
                  </div>
                </div>
              </div>
              {introText && (
                <p className="text-sm leading-relaxed m-0 max-w-md"
                  style={{
                    fontFamily: t.fontBody,
                    color: t.headerStyle === 'minimal' ? t.colorTextSecondary : 'rgba(255,255,255,0.8)',
                  }}>
                  {introText}
                </p>
              )}
            </div>

            {/* Preview search */}
            <div className="px-7 py-4 border-b"
              style={{ borderColor: t.colorBorder, backgroundColor: t.colorBackground }}>
              <div className="flex items-center gap-2 px-3.5 py-2.5 border"
                style={{
                  border: `1px solid ${t.colorBorder}`,
                  borderRadius:
                    t.buttonStyle === 'pill'  ? '9999px' :
                    t.buttonStyle === 'sharp' ? '4px' : '10px',
                  backgroundColor: t.colorSurfaceSubtle,
                }}>
                <span style={{ color: t.colorTextMuted }}>🔍</span>
                <span className="text-sm" style={{ fontFamily: t.fontBody, color: t.colorTextMuted }}>
                  Search roles…
                </span>
              </div>
            </div>

            {/* Preview job cards */}
            <div className="px-7 py-4" style={{ backgroundColor: t.colorBackground }}>
              {[
                { title: 'Senior Product Designer', loc: 'London · Hybrid', type: 'Full-time' },
                { title: 'Frontend Engineer',        loc: 'Remote',          type: 'Full-time' },
                { title: 'Growth Lead',              loc: 'New York · Onsite',type: 'Contract' },
              ].map((j, i, arr) => (
                <div key={i}
                  className="flex justify-between items-center py-4"
                  style={{ borderBottom: i < arr.length - 1 ? `1px solid ${t.colorBorder}` : 'none' }}>
                  <div>
                    <div className="text-sm font-bold"
                      style={{ fontFamily: t.fontDisplay, color: t.colorTextPrimary }}>
                      {j.title}
                    </div>
                    <div className="text-xs mt-0.5"
                      style={{ fontFamily: t.fontBody, color: t.colorTextSecondary }}>
                      {j.loc} · {j.type}
                    </div>
                  </div>
                  <button
                    className="border-0 text-xs font-semibold cursor-pointer px-4 py-2"
                    style={{
                      fontFamily: t.fontBody,
                      backgroundColor: t.colorAccent,
                      color: t.colorAccentFg,
                      borderRadius:
                        t.buttonStyle === 'pill'  ? '9999px' :
                        t.buttonStyle === 'sharp' ? '3px' : '8px',
                    }}>
                    Apply →
                  </button>
                </div>
              ))}
            </div>

            {/* Preview footer */}
            <div className="px-7 py-4 text-center text-xs border-t"
              style={{ borderColor: t.colorBorder, color: t.colorTextMuted, backgroundColor: t.colorBackground }}>
              Powered by <span className="font-extrabold" style={{ color: t.colorTextPrimary }}>Jobuki</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Small helper ──────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-xs font-semibold mb-2 tracking-wide"
        style={{ color: 'var(--color-text-primary)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
