import { useEffect, useRef, useState } from 'react'
import { useLoaderData, useActionData, Form, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../lib/auth.server'
import { resolveTheme, themeToCSS } from '../../lib/theme'
import { suggestAccents, readableFg, isValidHex, isDarkBackground, getNeutralPalette } from '../../lib/color'
import { ThemeColorPanel } from '../../components/theme-color-panel'
import { addCustomDomain, isValidDomain, removeCustomDomain } from '../../lib/railway'
import { ALLOWED_IMAGE_MIME_TYPES, createBoardAssetUploadUrl, MAX_UPLOAD_BYTES } from '../../lib/r2.server'
import { titleCaseCategory } from '../../lib/board-categories'
import {
  resolveJobBoardThemeConfig,
  type BoardTheme,
  type HeaderStyle,
  type ButtonStyle,
  type JobBoardHeaderStyle,
  type JobBoardThemePreset,
  type JobBoardJobsLayout,
  type JobBoardThemeConfig,
  type JobBoardCssVariables,
} from '@jobuki/types'

// ── Loader ────────────────────────────────────────────────────────────
export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const boardInWorkspace = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardInWorkspace.id),
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
export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const form = await args.request.formData()
  const intent = form.get('intent') as string

  if (intent === 'sign_upload') {
    const kind = form.get('kind')
    const contentType = String(form.get('contentType') ?? '').trim().toLowerCase()
    const size = Number(form.get('size') ?? 0)

    if (kind !== 'logo' && kind !== 'header') {
      return Response.json({ ok: false, error: 'Invalid upload kind.' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(contentType as any)) {
      return Response.json(
        {
          ok: false,
          error: `Unsupported image type. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES[kind]) {
      return Response.json(
        {
          ok: false,
          error: `Image is too large. ${kind === 'logo' ? 'Logo' : 'Header'} max size is ${Math.floor(MAX_UPLOAD_BYTES[kind] / (1024 * 1024))}MB.`,
        },
        { status: 400 }
      )
    }

    try {
      const signed = await createBoardAssetUploadUrl({ boardId: board.id, kind, contentType })
      return Response.json({ ok: true, ...signed })
    } catch (error: any) {
      return Response.json(
        { ok: false, error: error?.message ?? 'Unable to create upload URL.' },
        { status: 500 }
      )
    }
  }

  // ── Save theme + visual config ────────────────────────────────────────
  if (intent === 'save') {
    const parseBool = (value: FormDataEntryValue | null) => value === 'true' || value === 'on'
    const parseOptional = (value: FormDataEntryValue | null) => {
      const safe = String(value ?? '').trim()
      return safe.length > 0 ? safe : undefined
    }

    const theme: BoardTheme = {
      ...resolveTheme(board.theme ?? {}),
      colorPrimary:        form.get('colorPrimary') as string,
      colorPrimaryFg:      form.get('colorPrimaryFg') as string,
      colorAccent:         form.get('colorAccent') as string,
      colorAccentFg:       form.get('colorAccentFg') as string,
      colorBackground:     form.get('colorBackground') as string,
      colorSurface:        form.get('colorSurface') as string,
      colorSurfaceSubtle:  form.get('colorSurfaceSubtle') as string,
      colorTextPrimary:    form.get('colorTextPrimary') as string,
      colorTextSecondary:  form.get('colorTextSecondary') as string,
      colorTextMuted:      form.get('colorTextMuted') as string,
      colorBorder:         form.get('colorBorder') as string,
      colorBorderStrong:   form.get('colorBorderStrong') as string,
      fontDisplay:         form.get('fontDisplay') as string,
      fontBody:            form.get('fontBody') as string,
      radiusSm:            form.get('radiusSm') as string,
      radiusMd:            form.get('radiusMd') as string,
      radiusLg:            form.get('radiusLg') as string,
      radiusXl:            form.get('radiusXl') as string,
      radius2xl:           form.get('radius2xl') as string,
      headerStyle:         form.get('headerStyle') as HeaderStyle,
      buttonStyle:         form.get('buttonStyle') as ButtonStyle,
      boardAmbientPrimary: form.get('boardAmbientPrimary') as string,
      boardAmbientAccent:  form.get('boardAmbientAccent') as string,
      boardHeroTint:       form.get('boardHeroTint') as string,
      boardCardTint:       form.get('boardCardTint') as string,
      boardHeaderSurfaceMix: form.get('boardHeaderSurfaceMix') as string,
      boardHeaderBlur:     form.get('boardHeaderBlur') as string,
    }

    // Read existing boardConfig to preserve all content fields managed by the Content page
    const existing = resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name })

    const boardConfig: JobBoardThemeConfig = {
      ...existing,
      // Only visual fields are updated here; content fields are preserved from existing
      logoUrl:      (form.get('boardConfigLogoUrl') as string)?.trim(),
      headerImageUrl: (form.get('boardConfigHeaderImageUrl') as string)?.trim(),
      brandColor:   (form.get('boardConfigBrandColor') as string)?.trim(),
      accentColor:  (form.get('boardConfigAccentColor') as string)?.trim(),
      backgroundColor: (form.get('boardConfigBackgroundColor') as string)?.trim(),
      headerStyle:  form.get('boardConfigHeaderStyle') as JobBoardHeaderStyle,
      themePreset:  form.get('boardConfigThemePreset') as JobBoardThemePreset,
      jobsLayout:   form.get('boardConfigJobsLayout') as JobBoardJobsLayout,
      showFilters:  parseBool(form.get('boardConfigShowFilters')),
      cssVariables: {
        pillActiveBg:       parseOptional(form.get('boardConfigCssVarPillActiveBg')),
        pillActiveFg:       parseOptional(form.get('boardConfigCssVarPillActiveFg')),
        pillActiveBorder:   parseOptional(form.get('boardConfigCssVarPillActiveBorder')),
        pillInactiveBg:     parseOptional(form.get('boardConfigCssVarPillInactiveBg')),
        pillInactiveFg:     parseOptional(form.get('boardConfigCssVarPillInactiveFg')),
        pillInactiveBorder: parseOptional(form.get('boardConfigCssVarPillInactiveBorder')),
        pillDisabledOpacity: parseOptional(form.get('boardConfigCssVarPillDisabledOpacity')),
      },
    }

    await db
      .update(boards)
      .set({
        logoUrl:      (form.get('logoUrl') as string)?.trim() || null,
        heroImageUrl: (form.get('heroImageUrl') as string)?.trim() || null,
        theme,
        boardConfig,
        updatedAt:    new Date(),
      })
      .where(eq(boards.id, args.params.id!))

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
        .where(eq(boards.id, args.params.id!))
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
        .where(eq(boards.id, args.params.id!))

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

// ── Board style presets ───────────────────────────────────────────────
const BOARD_STYLE_PRESETS = [
  {
    key: 'minimal',
    label: 'Minimal',
    bestFor: 'Engineering · SaaS · Dev tools',
    description: 'Clean, typographic, uncluttered. Lets roles speak for themselves.',
    displayFontName: 'Space Grotesk',
    bodyFontName: 'Inter',
    displayFont: "'Space Grotesk', sans-serif",
    bodyFont: "'Inter', sans-serif",
    sampleTitle: 'Staff Engineer',
    sampleMeta: 'Linear · Remote',
    tokens: {
      colorPrimary:       '#1D4ED8',
      colorPrimaryFg:     '#ffffff',
      colorAccent:        '#0EA5E9',
      colorAccentFg:      '#ffffff',
      colorBackground:    '#F8FAFC',
      colorSurface:       '#ffffff',
      colorSurfaceSubtle: '#F1F5F9',
      colorTextPrimary:   '#0F172A',
      colorTextSecondary: '#334155',
      colorTextMuted:     '#64748B',
      colorBorder:        '#E2E8F0',
      colorBorderStrong:  '#CBD5E1',
      fontDisplay:        "'Space Grotesk', sans-serif",
      fontBody:           "'Inter', sans-serif",
      radiusSm:  '4px',
      radiusMd:  '8px',
      radiusLg:  '10px',
      radiusXl:  '12px',
      radius2xl: '16px',
      buttonStyle: 'rounded',
      headerStyle: 'minimal',
    },
  },
  {
    key: 'community',
    label: 'Community',
    bestFor: 'Crypto · Web3 · DAOs · Startups',
    description: 'Warm, bold, approachable. The right energy for Web3 and community boards.',
    displayFontName: 'Unbounded',
    bodyFontName: 'Plus Jakarta Sans',
    displayFont: "'Unbounded', sans-serif",
    bodyFont: "'Plus Jakarta Sans', sans-serif",
    sampleTitle: 'Senior Dev',
    sampleMeta: 'Uniswap · Remote',
    tokens: {
      colorPrimary:       '#6C3BFF',
      colorPrimaryFg:     '#ffffff',
      colorAccent:        '#F97316',
      colorAccentFg:      '#ffffff',
      colorBackground:    '#F0EBE3',
      colorSurface:       '#FAF8F5',
      colorSurfaceSubtle: '#EDE6FF',
      colorTextPrimary:   '#16120E',
      colorTextSecondary: '#5C5248',
      colorTextMuted:     '#7C7067',
      colorBorder:        '#D4CBBD',
      colorBorderStrong:  '#B8AFA4',
      fontDisplay:        "'Unbounded', sans-serif",
      fontBody:           "'Plus Jakarta Sans', sans-serif",
      radiusSm:  '6px',
      radiusMd:  '14px',
      radiusLg:  '18px',
      radiusXl:  '22px',
      radius2xl: '28px',
      buttonStyle: 'rounded',
      headerStyle: 'minimal',
    },
  },
  {
    key: 'professional',
    label: 'Professional',
    bestFor: 'Finance · Legal · Executive',
    description: 'Authoritative serif display. Sets the tone for finance, legal, and executive boards.',
    displayFontName: 'Fraunces',
    bodyFontName: 'Barlow',
    displayFont: "'Fraunces', serif",
    bodyFont: "'Barlow', sans-serif",
    sampleTitle: 'Head of Legal',
    sampleMeta: 'Clifford Chance · London',
    tokens: {
      colorPrimary:       '#1B4332',
      colorPrimaryFg:     '#ffffff',
      colorAccent:        '#D97706',
      colorAccentFg:      '#ffffff',
      colorBackground:    '#FAFAF8',
      colorSurface:       '#ffffff',
      colorSurfaceSubtle: '#F3F4F0',
      colorTextPrimary:   '#0F172A',
      colorTextSecondary: '#334155',
      colorTextMuted:     '#64748B',
      colorBorder:        '#E2E4DF',
      colorBorderStrong:  '#CBD0C7',
      fontDisplay:        "'Fraunces', serif",
      fontBody:           "'Barlow', sans-serif",
      radiusSm:  '2px',
      radiusMd:  '4px',
      radiusLg:  '6px',
      radiusXl:  '8px',
      radius2xl: '10px',
      buttonStyle: 'sharp',
      headerStyle: 'minimal',
    },
  },
]

// ── Component ─────────────────────────────────────────────────────────
const DISPLAY_FONT_OPTIONS = [
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Unbounded',         value: "'Unbounded', sans-serif" },
  { label: 'Sora',              value: "'Sora', sans-serif" },
  { label: 'Space Grotesk',     value: "'Space Grotesk', sans-serif" },
  { label: 'Manrope',           value: "'Manrope', sans-serif" },
  { label: 'Inter',             value: "'Inter', sans-serif" },
]

const BODY_FONT_OPTIONS = [
  { label: 'DM Sans',           value: "'DM Sans', sans-serif" },
  { label: 'Inter',             value: "'Inter', sans-serif" },
  { label: 'Manrope',           value: "'Manrope', sans-serif" },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
]

const FONT_PAIR_PRESETS = [
  {
    label: 'Jakarta + DM Sans',
    display: "'Plus Jakarta Sans', sans-serif",
    body: "'DM Sans', sans-serif",
  },
  {
    label: 'Sora + Inter',
    display: "'Sora', sans-serif",
    body: "'Inter', sans-serif",
  },
  {
    label: 'Space Grotesk + Inter',
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
  },
  {
    label: 'Manrope + Inter',
    display: "'Manrope', sans-serif",
    body: "'Inter', sans-serif",
  },
  {
    label: 'Unbounded + DM Sans',
    display: "'Unbounded', sans-serif",
    body: "'DM Sans', sans-serif",
  },
]

const SWATCH_PRESETS = [
  '#3730A3', '#0D9488', '#D97706', '#DC2626', '#16A34A',
  '#7C3AED', '#DB2777', '#0284C7', '#1C1917', '#374151',
]

const UPLOAD_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml'

export default function AppearancePage() {
  const { board, theme, boardConfig } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSaving = navigation.state === 'submitting'

  // Local state for live preview
  const [t, setT] = useState(theme)
  const [logoUrl, setLogoUrl]           = useState(boardConfig.logoUrl ?? board.logoUrl ?? '')
  const [heroImageUrl, setHeroImageUrl] = useState(boardConfig.headerImageUrl ?? board.heroImageUrl ?? '')
  const introText = board.introText ?? ''
  const [configLogoUrl, setConfigLogoUrl] = useState(boardConfig.logoUrl ?? '')
  const [configHeaderImageUrl, setConfigHeaderImageUrl] = useState(boardConfig.headerImageUrl ?? '')
  const [configBrandColor, setConfigBrandColor] = useState(boardConfig.brandColor)
  const [configAccentColor, setConfigAccentColor] = useState(boardConfig.accentColor ?? '')
  const [configBackgroundColor, setConfigBackgroundColor] = useState(boardConfig.backgroundColor ?? '')
  const [configHeaderStyle, setConfigHeaderStyle] = useState<JobBoardHeaderStyle>(boardConfig.headerStyle)
  const [configThemePreset, setConfigThemePreset] = useState<JobBoardThemePreset>(boardConfig.themePreset)
  const [configJobsLayout, setConfigJobsLayout] = useState<JobBoardJobsLayout>(boardConfig.jobsLayout)
  const [configShowFilters, setConfigShowFilters] = useState(boardConfig.showFilters)
  const [configEmptyStateIcon, setConfigEmptyStateIcon] = useState<JobBoardEmptyStateIcon>(boardConfig.emptyState.icon ?? 'search')
  const [configEmptyStateTitle, setConfigEmptyStateTitle] = useState(boardConfig.emptyState.title)
  const [configEmptyStateDescription, setConfigEmptyStateDescription] = useState(boardConfig.emptyState.description)
  const [configEmptyStateCtaLabel, setConfigEmptyStateCtaLabel] = useState(boardConfig.emptyState.ctaLabel ?? '')
  const [configEmptyStateCtaUrl, setConfigEmptyStateCtaUrl] = useState(boardConfig.emptyState.ctaUrl ?? '')
  const [configFooterShowPoweredBy, setConfigFooterShowPoweredBy] = useState(boardConfig.footer.showPoweredBy)
  const [configFooterXUrl, setConfigFooterXUrl] = useState(boardConfig.footer.xUrl ?? '')
  const [configCssVarPillActiveBg, setConfigCssVarPillActiveBg] = useState(boardConfig.cssVariables?.pillActiveBg ?? '')
  const [configCssVarPillActiveFg, setConfigCssVarPillActiveFg] = useState(boardConfig.cssVariables?.pillActiveFg ?? '')
  const [configCssVarPillActiveBorder, setConfigCssVarPillActiveBorder] = useState(boardConfig.cssVariables?.pillActiveBorder ?? '')
  const [configCssVarPillInactiveBg, setConfigCssVarPillInactiveBg] = useState(boardConfig.cssVariables?.pillInactiveBg ?? '')
  const [configCssVarPillInactiveFg, setConfigCssVarPillInactiveFg] = useState(boardConfig.cssVariables?.pillInactiveFg ?? '')
  const [configCssVarPillInactiveBorder, setConfigCssVarPillInactiveBorder] = useState(boardConfig.cssVariables?.pillInactiveBorder ?? '')
  const [configCssVarPillDisabledOpacity, setConfigCssVarPillDisabledOpacity] = useState(boardConfig.cssVariables?.pillDisabledOpacity ?? '')

  const [uploadingKind, setUploadingKind] = useState<'logo' | 'header' | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'brand' | 'colors' | 'design'>('brand')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error'; message: string }>>([])
  const [logoDimensions, setLogoDimensions] = useState<{ width: number; height: number } | null>(null)

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const updateToken = (key: keyof BoardTheme, value: string) =>
    setT(prev => ({ ...prev, [key]: value }))

  function applyPreset(preset: (typeof BOARD_STYLE_PRESETS)[number]) {
    setT(prev => ({ ...prev, ...(preset.tokens as Partial<BoardTheme>) }))
    setConfigThemePreset(preset.key as any)
  }

  useEffect(() => {
    if (!actionData) return
    const message = actionData.message ?? actionData.error ?? 'Done.'
    pushToast(actionData.ok ? 'success' : 'error', message)
    if (actionData.ok) setPanelOpen(false)
  }, [actionData])

  useEffect(() => {
    if (!logoUrl) {
      setLogoDimensions(null)
      return
    }

    const img = new Image()
    img.onload = () => {
      setLogoDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      setLogoDimensions(null)
    }
    img.src = logoUrl
  }, [logoUrl])

  const readErrorMessage = async (response: Response) => {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => null)
      return payload?.error || payload?.message || 'Request failed.'
    }

    const text = await response.text().catch(() => '')
    if (!text) return `Request failed with status ${response.status}.`
    if (text.includes('<!DOCTYPE')) return 'The server returned an HTML error page instead of an upload response.'
    return text.slice(0, 240)
  }

  const uploadAsset = async (kind: 'logo' | 'header', file: File) => {
    setUploadError(null)
    setUploadingKind(kind)

    try {
      const uploadData = new FormData()
      uploadData.set('boardId', board.id)
      uploadData.set('kind', kind)
      uploadData.set('file', file)

      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadData,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'fetch',
        },
      })

      if (!uploadRes.ok) {
        throw new Error(await readErrorMessage(uploadRes))
      }

      const uploadContentType = uploadRes.headers.get('content-type') ?? ''
      if (!uploadContentType.includes('application/json')) {
        if (uploadRes.redirected && uploadRes.url.includes('/sign-in')) {
          throw new Error('Your session has expired. Please sign in again and retry upload.')
        }

        const serverText = await uploadRes.text().catch(() => '')
        if (serverText.includes('<!DOCTYPE')) {
          throw new Error('Upload endpoint returned HTML instead of JSON.')
        }

        throw new Error('Upload endpoint returned an unexpected response format.')
      }

      const uploadJson = await uploadRes.json().catch(() => null)
      if (!uploadJson?.ok || !uploadJson?.publicUrl) {
        throw new Error(uploadJson?.error || 'Unable to upload image.')
      }

      if (kind === 'logo') {
        setLogoUrl(uploadJson.publicUrl)
        setConfigLogoUrl(uploadJson.publicUrl)
        pushToast('success', 'Logo uploaded. Click Save appearance to publish it.')
      } else {
        setHeroImageUrl(uploadJson.publicUrl)
        setConfigHeaderImageUrl(uploadJson.publicUrl)
        pushToast('success', 'Header image uploaded. Click Save appearance to publish it.')
      }
    } catch (error: any) {
      const message = error?.message ?? 'Upload failed.'
      setUploadError(message)
      pushToast('error', message)
    } finally {
      setUploadingKind(null)
    }
  }

  // Scoped to .board-preview so it never bleeds into the admin shell
  const previewCssVariables: JobBoardCssVariables = {
    pillActiveBg: configCssVarPillActiveBg || undefined,
    pillActiveFg: configCssVarPillActiveFg || undefined,
    pillActiveBorder: configCssVarPillActiveBorder || undefined,
    pillInactiveBg: configCssVarPillInactiveBg || undefined,
    pillInactiveFg: configCssVarPillInactiveFg || undefined,
    pillInactiveBorder: configCssVarPillInactiveBorder || undefined,
    pillDisabledOpacity: configCssVarPillDisabledOpacity || undefined,
  }
  const previewCSS = themeToCSS(t, '.board-preview', previewCssVariables)

  return (
    <div className="relative h-screen overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Settings panel — slides in from right ── */}
      <div
        className="absolute top-0 right-0 h-full z-30 flex flex-col border-l"
        style={{
          width: '22rem',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: panelOpen ? '-8px 0 32px rgba(0,0,0,0.1)' : 'none',
        }}>

        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-extrabold m-0"
              style={{ color: 'var(--color-text-primary)' }}>Appearance</h2>
            <p className="text-xs mt-0.5 m-0"
              style={{ color: 'var(--color-text-secondary)' }}>
              {board.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-subtle)' }}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Scrollable settings */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Board Style presets ── */}
          <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Board Style
            </p>
            <div className="flex flex-col gap-2">
              {BOARD_STYLE_PRESETS.map(preset => {
                const isActive = configThemePreset === preset.key
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="text-left rounded-xl border p-3 transition-all"
                    style={{
                      borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: isActive ? 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))' : 'var(--color-surface)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em]"
                        style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {preset.label}
                      </span>
                      <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                        {preset.bestFor}
                      </span>
                    </div>
                    {/* Mini board preview */}
                    <div className="rounded-lg overflow-hidden mb-2"
                      style={{ backgroundColor: preset.tokens.colorBackground, border: `1px solid ${preset.tokens.colorBorder}` }}>
                      {/* Mini hero strip */}
                      <div className="px-3 pt-2.5 pb-2" style={{ backgroundColor: preset.tokens.colorSurface, borderBottom: `1px solid ${preset.tokens.colorBorder}` }}>
                        <div className="text-[13px] font-black leading-tight mb-0.5"
                          style={{ fontFamily: preset.displayFont, color: preset.tokens.colorTextPrimary, letterSpacing: preset.key === 'community' ? '-0.01em' : preset.key === 'professional' ? '0' : '-0.02em' }}>
                          {preset.sampleTitle}
                        </div>
                        <div className="text-[9px]" style={{ fontFamily: preset.bodyFont, color: preset.tokens.colorTextSecondary }}>
                          {preset.sampleMeta}
                        </div>
                      </div>
                      {/* Mini job row */}
                      <div className="px-3 py-2 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-semibold" style={{ fontFamily: preset.displayFont, color: preset.tokens.colorTextPrimary }}>
                            Frontend Engineer
                          </div>
                          <div className="text-[9px]" style={{ fontFamily: preset.bodyFont, color: preset.tokens.colorTextMuted }}>
                            Remote · Full-time
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 shrink-0"
                          style={{
                            backgroundColor: preset.tokens.colorPrimary,
                            color: preset.tokens.colorPrimaryFg,
                            borderRadius: preset.key === 'minimal' ? '6px' : preset.key === 'professional' ? '3px' : '12px',
                          }}>
                          Apply
                        </span>
                      </div>
                    </div>
                    <div className="text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {preset.displayFontName} · {preset.bodyFontName}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Advanced ── */}
          <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setAdvancedOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3 text-left"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>
                Advanced
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {advancedOpen ? '▲' : '▼'}
              </span>
            </button>

            {advancedOpen && (
              <div className="px-5 pb-4">
                <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl p-1"
                  style={{ backgroundColor: 'var(--color-surface-subtle)' }}>
                  {([{ key: 'brand', label: 'Brand' }, { key: 'colors', label: 'Colors' }, { key: 'design', label: 'Design' }] as const).map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className="py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all"
                      style={{
                        backgroundColor: activeTab === tab.key ? 'var(--color-surface)' : 'transparent',
                        color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        borderColor: activeTab === tab.key ? 'var(--color-border)' : 'transparent',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Appearance form (visual fields only) ── */}
          <Form method="post">
            <input type="hidden" name="intent" value="save" />
            <input type="hidden" name="logoUrl" value={logoUrl} />
            <input type="hidden" name="heroImageUrl" value={heroImageUrl} />
            <input type="hidden" name="boardConfigLogoUrl" value={configLogoUrl} />
            <input type="hidden" name="boardConfigHeaderImageUrl" value={configHeaderImageUrl} />
            <input type="hidden" name="boardConfigBrandColor" value={configBrandColor} />
            <input type="hidden" name="boardConfigAccentColor" value={configAccentColor} />
            <input type="hidden" name="boardConfigBackgroundColor" value={configBackgroundColor} />
            <input type="hidden" name="boardConfigHeaderStyle" value={configHeaderStyle} />
            <input type="hidden" name="boardConfigThemePreset" value={configThemePreset} />
            <input type="hidden" name="boardConfigJobsLayout" value={configJobsLayout} />
            <input type="hidden" name="boardConfigShowFilters" value={configShowFilters ? 'true' : 'false'} />
            <input type="hidden" name="boardConfigCssVarPillActiveBg" value={configCssVarPillActiveBg} />
            <input type="hidden" name="boardConfigCssVarPillActiveFg" value={configCssVarPillActiveFg} />
            <input type="hidden" name="boardConfigCssVarPillActiveBorder" value={configCssVarPillActiveBorder} />
            <input type="hidden" name="boardConfigCssVarPillInactiveBg" value={configCssVarPillInactiveBg} />
            <input type="hidden" name="boardConfigCssVarPillInactiveFg" value={configCssVarPillInactiveFg} />
            <input type="hidden" name="boardConfigCssVarPillInactiveBorder" value={configCssVarPillInactiveBorder} />
            <input type="hidden" name="boardConfigCssVarPillDisabledOpacity" value={configCssVarPillDisabledOpacity} />
            {/* Pass all theme tokens as hidden inputs */}
            {(Object.entries(t) as [keyof BoardTheme, string][]).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}

            {advancedOpen && <div className="px-5 pt-2">

            {/* Primary colour */}
            {activeTab === 'brand' && (
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
            )}

            {/* Accent colour + smart suggestions */}
            {activeTab === 'brand' && (
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
            )}

            {/* Background */}
            {activeTab === 'brand' && (
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
            )}

            {/* Colors Tab */}
            {activeTab === 'colors' && (
            <div className="pt-2">
              <ThemeColorPanel theme={t} onUpdate={updateToken} />
            </div>
            )}

            {/* Header style */}
            {activeTab === 'design' && (
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
            )}

            {/* Button style */}
            {activeTab === 'design' && (
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
            )}

            {activeTab === 'design' && (
            <Section label="BOARD VISUAL TUNING">
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Controls for public board atmosphere and chrome depth.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Ambient primary
                  </label>
                  <input
                    value={t.boardAmbientPrimary}
                    onChange={e => updateToken('boardAmbientPrimary', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                    placeholder="8%"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Ambient accent
                  </label>
                  <input
                    value={t.boardAmbientAccent}
                    onChange={e => updateToken('boardAmbientAccent', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                    placeholder="7%"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Hero tint
                  </label>
                  <input
                    value={t.boardHeroTint}
                    onChange={e => updateToken('boardHeroTint', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                    placeholder="8%"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Card tint
                  </label>
                  <input
                    value={t.boardCardTint}
                    onChange={e => updateToken('boardCardTint', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                    placeholder="4%"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Header surface mix
                  </label>
                  <input
                    value={t.boardHeaderSurfaceMix}
                    onChange={e => updateToken('boardHeaderSurfaceMix', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                    placeholder="88%"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Header blur
                  </label>
                  <input
                    value={t.boardHeaderBlur}
                    onChange={e => updateToken('boardHeaderBlur', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                    placeholder="8px"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>
            </Section>
            )}

            {activeTab === 'design' && (
            <Section label="ADVANCED CSS VARIABLES (OPTIONAL)">
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Optional pill-state overrides for power users. Leave blank to use system defaults.
              </p>
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfigCssVarPillActiveBg('')
                    setConfigCssVarPillActiveFg('')
                    setConfigCssVarPillActiveBorder('')
                    setConfigCssVarPillInactiveBg('')
                    setConfigCssVarPillInactiveFg('')
                    setConfigCssVarPillInactiveBorder('')
                    setConfigCssVarPillDisabledOpacity('')
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface)' }}
                >
                  Reset to system defaults
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  value={configCssVarPillActiveBg}
                  onChange={e => setConfigCssVarPillActiveBg(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="Pill active background (e.g. #1C1917)"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={configCssVarPillActiveFg}
                  onChange={e => setConfigCssVarPillActiveFg(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="Pill active text (e.g. #FAFAF8)"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={configCssVarPillActiveBorder}
                  onChange={e => setConfigCssVarPillActiveBorder(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="Pill active border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={configCssVarPillInactiveBg}
                  onChange={e => setConfigCssVarPillInactiveBg(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="Pill inactive background"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={configCssVarPillInactiveFg}
                  onChange={e => setConfigCssVarPillInactiveFg(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="Pill inactive text"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={configCssVarPillInactiveBorder}
                  onChange={e => setConfigCssVarPillInactiveBorder(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="Pill inactive border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
                <input
                  value={configCssVarPillDisabledOpacity}
                  onChange={e => setConfigCssVarPillDisabledOpacity(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border"
                  placeholder="Pill disabled opacity (e.g. 0.5)"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </Section>
            )}

            {/* Font */}
            {activeTab === 'brand' && (
            <Section label="FONT">
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Choose a display/body pair, then fine-tune if needed.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {FONT_PAIR_PRESETS.map(pair => {
                  const isActive = t.fontDisplay === pair.display && t.fontBody === pair.body
                  return (
                    <button
                      key={pair.label}
                      type="button"
                      onClick={() => {
                        updateToken('fontDisplay', pair.display)
                        updateToken('fontBody', pair.body)
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all"
                      style={{
                        backgroundColor: isActive ? t.colorPrimary + '18' : 'var(--color-surface-subtle)',
                        borderColor: isActive ? t.colorPrimary : 'var(--color-border)',
                        color: isActive ? t.colorPrimary : 'var(--color-text-secondary)',
                      }}
                    >
                      {pair.label}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Display font
                  </label>
                  <select
                    value={t.fontDisplay}
                    onChange={e => updateToken('fontDisplay', e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-xs border"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                  >
                    {DISPLAY_FONT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Body font
                  </label>
                  <select
                    value={t.fontBody}
                    onChange={e => updateToken('fontBody', e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-xs border"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
                  >
                    {BODY_FONT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>
            )}

            {/* Logo */}
            {activeTab === 'brand' && (
            <Section label="LOGO IMAGE">
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Current logo for the board header. Any ratio is supported (square, wide, or tall).
              </p>
              <div className="rounded-xl border p-3 mb-2 flex items-center justify-center"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', minHeight: 96 }}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="w-16 h-16 rounded-lg object-contain"
                    style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                  />
                ) : (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No logo uploaded</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    opacity: uploadingKind === 'logo' ? 0.65 : 1,
                  }}
                >
                  {uploadingKind === 'logo' ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                  <input
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    disabled={uploadingKind !== null}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      e.currentTarget.value = ''
                      if (file) void uploadAsset('logo', file)
                    }}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('')
                      setConfigLogoUrl('')
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)' }}
                  >
                    Remove
                  </button>
                )}
              </div>
              {logoDimensions && (
                <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Source: {logoDimensions.width} x {logoDimensions.height}px · Recommended display (@2x): {Math.max(1, Math.round(logoDimensions.width / 2))} x {Math.max(1, Math.round(logoDimensions.height / 2))}px
                </p>
              )}
            </Section>
            )}

            {/* Hero image */}
            {activeTab === 'design' && (
            <Section label="HERO BACKGROUND IMAGE">
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Header background image used on the public board.
              </p>
              <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Recommended: 2400 x 1200px (or same aspect ratio) for best quality across desktop and mobile.
              </p>
              <div className="rounded-xl border p-2 mb-2 overflow-hidden"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}>
                {heroImageUrl ? (
                  <div
                    className="rounded-lg"
                    style={{ height: 90, backgroundImage: `url(${heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                ) : (
                  <div className="rounded-lg flex items-center justify-center"
                    style={{ height: 90, color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)' }}>
                    <span className="text-xs">No header image uploaded</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    opacity: uploadingKind === 'header' ? 0.65 : 1,
                  }}
                >
                  {uploadingKind === 'header' ? 'Uploading…' : heroImageUrl ? 'Replace header image' : 'Upload header image'}
                  <input
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    disabled={uploadingKind !== null}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      e.currentTarget.value = ''
                      if (file) void uploadAsset('header', file)
                    }}
                  />
                </label>
                {heroImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setHeroImageUrl('')
                      setConfigHeaderImageUrl('')
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </Section>
            )}

            {/* Header & preset */}
            {activeTab === 'design' && (
            <Section label="LAYOUT & PRESET">
              <select
                value={configHeaderStyle}
                onChange={e => setConfigHeaderStyle(e.target.value as JobBoardHeaderStyle)}
                className="w-full px-2.5 py-2 rounded-lg text-xs border mb-2"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              >
                <option value="solid">Solid header</option>
                <option value="gradient">Gradient header</option>
                <option value="image">Image header</option>
              </select>
              <select
                value={configThemePreset}
                onChange={e => setConfigThemePreset(e.target.value as JobBoardThemePreset)}
                className="w-full px-2.5 py-2 rounded-lg text-xs border mb-2"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}
              >
                <option value="minimal">Minimal</option>
                <option value="startup">Startup</option>
                <option value="editorial">Editorial</option>
                <option value="bold">Bold</option>
                <option value="dark">Dark</option>
              </select>
              <LayoutPicker value={configJobsLayout} onChange={setConfigJobsLayout} />
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <input type="checkbox" checked={configShowFilters} onChange={e => setConfigShowFilters(e.target.checked)} />
                Show filters
              </label>
            </Section>
            )}

            {activeTab === 'design' && (
            <Section label="JOBS LAYOUT">
              <LayoutPicker value={configJobsLayout} onChange={setConfigJobsLayout} />
            </Section>
            )}


            </div> /* end advancedOpen */}

            <div className="px-5 pt-4 pb-5">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border-0 cursor-pointer transition-all"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)', opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? 'Saving…' : 'Save appearance'}
              </button>
            </div>
          </Form>


        </div>
      </div>

      {/* ── Mobile backdrop ── */}
      {panelOpen && (
        <div
          className="md:hidden absolute inset-0 z-20"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* ── Full-width live preview ── */}
      <div className="absolute inset-0 flex flex-col overflow-hidden"
        style={{ backgroundColor: '#E8E6E1' }}>

        {/* Preview bar */}
        <div className="px-5 py-3 border-b flex items-center justify-between shrink-0"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
            <span className="text-xs font-semibold tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}>LIVE PREVIEW</span>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={{
              borderColor: panelOpen ? 'var(--color-primary)' : 'var(--color-border)',
              color: panelOpen ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: panelOpen ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)',
            }}
          >
            ◑ Customise
          </button>
        </div>

        {/* Preview frame — board-preview class is the CSS scope boundary */}
        <div className="board-preview flex-1 overflow-auto" style={{ backgroundColor: t.colorBackground }}>
          <style dangerouslySetInnerHTML={{ __html: previewCSS }} />

          <div className="mx-auto" style={{ maxWidth: '860px' }}>

            {/* ── Nav ── */}
            <div className="px-7 py-4 flex items-center justify-between border-b"
              style={{
                backgroundColor:
                  t.headerStyle === 'coloured' ? t.colorPrimary :
                  t.headerStyle === 'bold'     ? t.colorTextPrimary :
                  t.colorSurface,
                borderColor: t.headerStyle === 'minimal' ? t.colorBorder : 'transparent',
              }}>
              <div className="flex items-center gap-2.5">
                {logoUrl ? (
                  <img src={logoUrl} alt={board.name}
                    style={{ height: 28, width: 'auto', objectFit: 'contain', display: 'block', maxWidth: 140 }} />
                ) : (
                  <span className="text-sm font-extrabold"
                    style={{ fontFamily: t.fontDisplay, color: t.headerStyle === 'minimal' ? t.colorTextPrimary : '#fff' }}>
                    {board.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ fontFamily: t.fontBody, color: t.headerStyle === 'minimal' ? t.colorTextSecondary : 'rgba(255,255,255,0.75)' }}>
                  Browse
                </span>
                <span className="text-xs font-semibold px-4 py-1.5 rounded-lg"
                  style={{
                    fontFamily: t.fontBody,
                    backgroundColor: t.colorAccent,
                    color: t.colorAccentFg,
                    borderRadius: t.buttonStyle === 'pill' ? '9999px' : t.buttonStyle === 'sharp' ? '3px' : '8px',
                  }}>
                  Post a role
                </span>
              </div>
            </div>

            {/* ── Hero ── */}
            <div className="relative px-8 pt-10 pb-8"
              style={{
                backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: heroImageUrl ? undefined : t.colorSurface,
              }}>
              {heroImageUrl && (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.28) 100%)', pointerEvents: 'none' }} />
              )}
              <div style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
                {/* Live badge */}
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-4"
                  style={{
                    backgroundColor: heroImageUrl ? 'rgba(255,255,255,0.15)' : t.colorSurfaceSubtle,
                    color: heroImageUrl ? 'rgba(255,255,255,0.9)' : t.colorTextSecondary,
                    border: `1px solid ${heroImageUrl ? 'rgba(255,255,255,0.2)' : t.colorBorder}`,
                  }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: t.colorAccent, display: 'inline-block' }} />
                  14 open roles
                </div>

                {/* Hero headline — font-size mapped to display font character */}
                {(() => {
                  const isUnbounded = t.fontDisplay.includes('Unbounded')
                  const isFraunces = t.fontDisplay.includes('Fraunces')
                  const fontSize = isUnbounded ? '1.45rem' : isFraunces ? '2.4rem' : '2.1rem'
                  const letterSpacing = isUnbounded ? '-0.01em' : isFraunces ? '0' : '-0.03em'
                  const lineHeight = isUnbounded ? '1.2' : isFraunces ? '1.1' : '1.15'
                  const headingStyle = { fontFamily: t.fontDisplay, color: heroImageUrl ? '#fff' : t.colorTextPrimary, fontSize, letterSpacing, lineHeight, marginBottom: '0.75rem' }
                  return boardConfig.heroHeadline ? (
                    <div style={headingStyle} dangerouslySetInnerHTML={{ __html: boardConfig.heroHeadline }} />
                  ) : (
                    <h1 className="m-0 font-extrabold" style={headingStyle}>
                      {board.name} Jobs
                    </h1>
                  )
                })()}

                {/* Tagline */}
                {(boardConfig.tagline || introText) && (
                  <p className="text-sm leading-relaxed mb-5 m-0"
                    style={{ fontFamily: t.fontBody, color: heroImageUrl ? 'rgba(255,255,255,0.82)' : t.colorTextSecondary }}>
                    {boardConfig.tagline || introText}
                  </p>
                )}

                {/* Search bar */}
                {boardConfig.showSearch && (
                  <div className="flex items-center gap-2 px-4 py-3 border"
                    style={{
                      backgroundColor: t.colorSurface,
                      border: `1px solid ${t.colorBorder}`,
                      borderRadius: t.buttonStyle === 'pill' ? '9999px' : t.buttonStyle === 'sharp' ? '4px' : '12px',
                      maxWidth: 420,
                    }}>
                    <span style={{ color: t.colorTextMuted, fontSize: 14 }}>🔍</span>
                    <span className="text-sm flex-1" style={{ fontFamily: t.fontBody, color: t.colorTextMuted }}>
                      Role, skill or company…
                    </span>
                    <span className="text-xs font-bold px-4 py-1.5"
                      style={{
                        backgroundColor: t.colorPrimary,
                        color: t.colorPrimaryFg,
                        borderRadius: t.buttonStyle === 'pill' ? '9999px' : t.buttonStyle === 'sharp' ? '3px' : '8px',
                      }}>
                      Search →
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Category pills ── */}
            {boardConfig.categories && boardConfig.categories.length > 0 && (
              <div className="px-8 pt-5 pb-2 flex flex-wrap gap-2" style={{ backgroundColor: t.colorBackground }}>
                {boardConfig.categories.slice(0, 6).map((cat: string) => (
                  <span key={cat} className="text-xs font-semibold px-3 py-1.5 border"
                    style={{
                      fontFamily: t.fontBody,
                      borderRadius: t.buttonStyle === 'pill' ? '9999px' : t.buttonStyle === 'sharp' ? '3px' : '20px',
                      borderColor: t.colorBorder,
                      color: t.colorTextSecondary,
                      backgroundColor: t.colorSurface,
                    }}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            )}

            {/* ── Job cards ── */}
            <div className="px-8 py-4" style={{ backgroundColor: t.colorBackground }}>
              {[
                { title: 'Senior Product Designer', company: 'Acme Co', loc: 'London · Hybrid', type: 'Full-time', remote: 'hybrid' },
                { title: 'Frontend Engineer',        company: 'Vercel',  loc: 'Remote',           type: 'Full-time', remote: 'remote' },
                { title: 'Growth Lead',              company: 'Stripe',  loc: 'New York · On-site',type: 'Contract', remote: 'onsite' },
              ].map((j, i, arr) => (
                <div key={i}
                  className="flex items-center justify-between py-4 gap-4"
                  style={{ borderBottom: i < arr.length - 1 ? `1px solid ${t.colorBorder}` : 'none' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl border shrink-0"
                      style={{ backgroundColor: t.colorSurfaceSubtle, borderColor: t.colorBorder }} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate"
                        style={{ fontFamily: t.fontDisplay, color: t.colorTextPrimary }}>
                        {j.title}
                      </div>
                      <div className="text-xs mt-0.5"
                        style={{ fontFamily: t.fontBody, color: t.colorTextSecondary }}>
                        <strong>{j.company}</strong> · {j.loc}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: j.remote === 'remote' ? `${t.colorAccent}22` : t.colorSurfaceSubtle,
                        color: j.remote === 'remote' ? t.colorAccent : t.colorTextMuted,
                      }}>
                      {j.remote === 'remote' ? 'Remote' : j.remote === 'hybrid' ? 'Hybrid' : 'On-site'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer ── */}
            <div className="px-8 py-5 text-center text-xs border-t"
              style={{ borderColor: t.colorBorder, color: t.colorTextMuted, backgroundColor: t.colorBackground, fontFamily: t.fontBody }}>
              {configFooterShowPoweredBy
                ? <>Powered by <span className="font-extrabold" style={{ color: t.colorTextPrimary }}>Jobuki</span></>
                : board.name}
            </div>
          </div>
        </div>
      </div> {/* end preview */}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="px-3 py-2.5 rounded-xl border text-xs font-medium shadow-lg"
            style={toast.type === 'success'
              ? {
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                borderColor: 'var(--color-success)',
              }
              : {
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                borderColor: 'var(--color-danger)',
              }}
          >
            {toast.type === 'success' ? '✓ ' : '✗ '}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Small helper ──────────────────────────────────────────────────────
const LAYOUT_OPTIONS: { value: JobBoardJobsLayout; label: string; icon: React.ReactNode }[] = [
  {
    value: 'list',
    label: 'List',
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
        <rect x="0" y="0" width="28" height="5" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="0" y="8.5" width="28" height="5" rx="1.5" fill="currentColor" opacity=".6"/>
        <rect x="0" y="17" width="28" height="5" rx="1.5" fill="currentColor" opacity=".35"/>
      </svg>
    ),
  },
  {
    value: 'boxes',
    label: 'Grid',
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
        <rect x="0" y="0" width="12" height="10" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="16" y="0" width="12" height="10" rx="1.5" fill="currentColor" opacity=".6"/>
        <rect x="0" y="12" width="12" height="10" rx="1.5" fill="currentColor" opacity=".6"/>
        <rect x="16" y="12" width="12" height="10" rx="1.5" fill="currentColor" opacity=".35"/>
      </svg>
    ),
  },
  {
    value: 'bento',
    label: 'Bento',
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
        <rect x="0" y="0" width="17" height="13" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="19" y="0" width="9" height="6" rx="1.5" fill="currentColor" opacity=".6"/>
        <rect x="19" y="7" width="9" height="6" rx="1.5" fill="currentColor" opacity=".35"/>
        <rect x="0" y="15" width="8" height="7" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="10" y="15" width="18" height="7" rx="1.5" fill="currentColor" opacity=".35"/>
      </svg>
    ),
  },
]

function LayoutPicker({ value, onChange }: { value: JobBoardJobsLayout; onChange: (v: JobBoardJobsLayout) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LAYOUT_OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
            style={{
              backgroundColor: active ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))' : 'var(--color-surface-subtle)',
              borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
              color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            {opt.icon}
            <span className="text-[10px] font-bold">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

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
