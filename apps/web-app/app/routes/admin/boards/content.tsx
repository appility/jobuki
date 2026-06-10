import { useState, useRef, useEffect } from 'react'
import { useLoaderData, useActionData, Form, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { parseBoardCategories, titleCaseCategory } from '../../../lib/board-categories'
import { HeroHeadlineEditor } from '../../../components/rich-text/HeroHeadlineEditor'
import { PageContentEditor } from '../../../components/rich-text/PageContentEditor'
import { TEMPLATE_LABELS, type PrivacyTemplate } from '../../../lib/privacy-templates'

// ── Loader ────────────────────────────────────────────────────────────
export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const full = await db.query.boards.findFirst({ where: eq(boards.id, board.id) })
  if (!full) throw new Response('Not found', { status: 404 })
  const boardConfig = resolveJobBoardThemeConfig(full.boardConfig, {
    boardName: full.name,
    tagline: full.introText ?? undefined,
  })
  return {
    board: full,
    boardConfig,
    brandColor: (full.theme as any)?.colorPrimary ?? '#6C3BFF',
    accentColor: (full.theme as any)?.colorAccent ?? '#F97316',
  }
}

// ── Action ────────────────────────────────────────────────────────────
export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const full = await db.query.boards.findFirst({ where: eq(boards.id, board.id) })
  if (!full) throw new Response('Not found', { status: 404 })

  const form = await args.request.formData()
  const g = (k: string) => (form.get(k) as string ?? '').trim()
  const gb = (k: string) => form.get(k) === 'true'

  // Merge content fields into existing boardConfig (preserves visual settings)
  const existing = resolveJobBoardThemeConfig(full.boardConfig, { boardName: full.name })
  const updated = {
    ...existing,
    boardName: g('boardName') || existing.boardName,
    tagline: g('tagline') || undefined,
    taglineColor: g('taglineColor') || undefined,
    heroHeadline: g('heroHeadline') || undefined,
    categories: parseBoardCategories(g('categories')),
    emptyState: {
      ...existing.emptyState,
      ctaLabel: g('emptyStateCtaLabel') || undefined,
      ctaUrl: g('emptyStateCtaUrl') || undefined,
    },
    footer: {
      ...existing.footer,
      showPoweredBy: gb('footerShowPoweredBy'),
      xUrl: g('footerXUrl') || undefined,
      linkedinUrl: g('footerLinkedinUrl') || undefined,
      companyWebsiteUrl: g('footerCompanyWebsiteUrl') || undefined,
    },
    seo: {
      metaTitle: g('seoMetaTitle') || undefined,
      metaDescription: g('seoMetaDescription') || undefined,
      ogImageUrl: g('seoOgImageUrl') || undefined,
      noindex: form.get('seoNoindex') === 'true',
    },
    pages: {
      about: {
        enabled: gb('aboutEnabled'),
        content: g('aboutContent') || undefined,
      },
      privacy: {
        enabled: gb('privacyEnabled'),
        template: (g('privacyTemplate') as PrivacyTemplate) || 'global',
        legalName: g('privacyLegalName') || undefined,
        contactEmail: g('privacyEmail') || undefined,
        websiteUrl: g('privacyWebsiteUrl') || undefined,
      },
    },
  }

  await db.update(boards).set({
    name: g('boardName') || full.name,
    introText: g('introText') || null,
    boardConfig: updated,
    updatedAt: new Date(),
  }).where(eq(boards.id, board.id))

  return { ok: true, message: 'Content saved.' }
}

// ── Helpers ───────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="block text-xs font-bold uppercase tracking-[0.06em] mb-1.5"
        style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      {hint && <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
      {children}
    </div>
  )
}

const INPUT = 'w-full px-3 py-2.5 rounded-xl text-sm border'
const INPUT_STYLE = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }

// ── Component ─────────────────────────────────────────────────────────
export default function BoardContent() {
  const { board, boardConfig, brandColor, accentColor } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const saving = navigation.state === 'submitting'

  type Tab = 'brand' | 'hero' | 'categories' | 'legal' | 'seo'
  const [activeTab, setActiveTab] = useState<Tab>('brand')
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error'; message: string }>>([])

  // Hero tab state
  const [boardName, setBoardName] = useState(boardConfig.boardName)
  const [introText, setIntroText] = useState(board.introText ?? '')
  const [tagline, setTagline] = useState(boardConfig.tagline ?? '')
  const [taglineColor, setTaglineColor] = useState(boardConfig.taglineColor ?? '')
  const [heroHeadline, setHeroHeadline] = useState(boardConfig.heroHeadline ?? '')
  const heroHeadlineRef = useRef(boardConfig.heroHeadline ?? '')
  const [categoriesText, setCategoriesText] = useState(
    (boardConfig.categories ?? []).map(c => titleCaseCategory(c)).join('\n')
  )
  const [emptyStateCtaLabel, setEmptyStateCtaLabel] = useState(boardConfig.emptyState.ctaLabel ?? '')
  const [emptyStateCtaUrl, setEmptyStateCtaUrl] = useState(boardConfig.emptyState.ctaUrl ?? '')
  const [footerShowPoweredBy, setFooterShowPoweredBy] = useState(boardConfig.footer.showPoweredBy)
  const [footerXUrl, setFooterXUrl] = useState(boardConfig.footer.xUrl ?? '')
  const [footerLinkedinUrl, setFooterLinkedinUrl] = useState(boardConfig.footer.linkedinUrl ?? '')
  const [footerCompanyWebsiteUrl, setFooterCompanyWebsiteUrl] = useState(boardConfig.footer.companyWebsiteUrl ?? '')

  // SEO tab state
  const [seoMetaTitle, setSeoMetaTitle] = useState(boardConfig.seo?.metaTitle ?? '')
  const [seoMetaDescription, setSeoMetaDescription] = useState(boardConfig.seo?.metaDescription ?? '')
  const [seoOgImageUrl, setSeoOgImageUrl] = useState(boardConfig.seo?.ogImageUrl ?? '')
  const [seoNoindex, setSeoNoindex] = useState(boardConfig.seo?.noindex ?? false)

  // Pages tab state
  const [aboutEnabled, setAboutEnabled] = useState(boardConfig.pages?.about?.enabled ?? false)
  const [aboutContent, setAboutContent] = useState(boardConfig.pages?.about?.content ?? '')
  const [privacyEnabled, setPrivacyEnabled] = useState(boardConfig.pages?.privacy?.enabled ?? false)
  const [privacyTemplate, setPrivacyTemplate] = useState<PrivacyTemplate>(boardConfig.pages?.privacy?.template ?? 'global')
  const [privacyLegalName, setPrivacyLegalName] = useState(boardConfig.pages?.privacy?.legalName ?? '')
  const [privacyEmail, setPrivacyEmail] = useState(boardConfig.pages?.privacy?.contactEmail ?? '')
  const [privacyWebsiteUrl, setPrivacyWebsiteUrl] = useState(boardConfig.pages?.privacy?.websiteUrl ?? '')

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  useEffect(() => {
    if (!actionData) return
    if (actionData.ok && actionData.message) pushToast('success', actionData.message)
    else if (!actionData.ok) pushToast('error', 'Save failed.')
  }, [actionData])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'brand',      label: 'Brand' },
    { key: 'hero',       label: 'Hero' },
    { key: 'categories', label: 'Categories' },
    { key: 'legal',      label: 'Legal' },
    { key: 'seo',        label: 'SEO' },
  ]

  return (
    <div className="w-full p-10 max-w-2xl">
      <h1 className="text-2xl font-extrabold mb-8" style={{ color: 'var(--color-text-primary)' }}>
        Content
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition-colors"
            style={{
              borderBottomColor: activeTab === tab.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Form method="post">
        {/* Hidden fields — always submitted regardless of active tab */}
        <input type="hidden" name="boardName" value={boardName} />
        <input type="hidden" name="introText" value={introText} />
        <input type="hidden" name="tagline" value={tagline} />
        <input type="hidden" name="taglineColor" value={taglineColor} />
        <input type="hidden" name="heroHeadline" value={heroHeadline} />
        <input type="hidden" name="categories" value={categoriesText} />
        <input type="hidden" name="emptyStateCtaLabel" value={emptyStateCtaLabel} />
        <input type="hidden" name="emptyStateCtaUrl" value={emptyStateCtaUrl} />
        <input type="hidden" name="footerShowPoweredBy" value={footerShowPoweredBy ? 'true' : 'false'} />
        <input type="hidden" name="footerXUrl" value={footerXUrl} />
        <input type="hidden" name="footerLinkedinUrl" value={footerLinkedinUrl} />
        <input type="hidden" name="footerCompanyWebsiteUrl" value={footerCompanyWebsiteUrl} />
        <input type="hidden" name="seoMetaTitle" value={seoMetaTitle} />
        <input type="hidden" name="seoMetaDescription" value={seoMetaDescription} />
        <input type="hidden" name="seoOgImageUrl" value={seoOgImageUrl} />
        <input type="hidden" name="seoNoindex" value={seoNoindex ? 'true' : 'false'} />
        <input type="hidden" name="aboutEnabled" value={aboutEnabled ? 'true' : 'false'} />
        <input type="hidden" name="aboutContent" value={aboutContent} />
        <input type="hidden" name="privacyEnabled" value={privacyEnabled ? 'true' : 'false'} />
        <input type="hidden" name="privacyTemplate" value={privacyTemplate} />
        <input type="hidden" name="privacyLegalName" value={privacyLegalName} />
        <input type="hidden" name="privacyEmail" value={privacyEmail} />
        <input type="hidden" name="privacyWebsiteUrl" value={privacyWebsiteUrl} />

        {/* ── Brand tab ── */}
        {activeTab === 'brand' && (
          <div className="">
            <Field label="Board name">
              <input value={boardName} onChange={e => setBoardName(e.target.value)}
                className={INPUT} style={INPUT_STYLE} placeholder="Your Job Board Name" />
            </Field>

            <Field label="Intro text" hint="Shown below the board name in the header area.">
              <textarea value={introText} onChange={e => setIntroText(e.target.value)}
                rows={3} className={INPUT + ' resize-y leading-relaxed'} style={INPUT_STYLE} />
            </Field>

            <Field label="Tagline" hint="Short line shown in the hero section.">
              <div className="flex items-center gap-2">
                <input value={tagline} onChange={e => setTagline(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm border" style={INPUT_STYLE}
                  placeholder="Find your next role here." />
                <input type="color" value={taglineColor || '#6b7280'}
                  onChange={e => setTaglineColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border p-0.5 shrink-0"
                  style={{ borderColor: 'var(--color-border)' }} title="Tagline colour" />
              </div>
            </Field>

            <Field label="Footer">
              <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                <input type="checkbox" checked={footerShowPoweredBy} onChange={e => setFooterShowPoweredBy(e.target.checked)} />
                Show "Powered by Jobuki"
              </label>
              <input value={footerXUrl} onChange={e => setFooterXUrl(e.target.value)}
                className={INPUT + ' mb-3'} style={INPUT_STYLE} placeholder="X / Twitter URL (optional)" />
              <input value={footerLinkedinUrl} onChange={e => setFooterLinkedinUrl(e.target.value)}
                className={INPUT + ' mb-3'} style={INPUT_STYLE} placeholder="LinkedIn URL (optional)" />
              <input value={footerCompanyWebsiteUrl} onChange={e => setFooterCompanyWebsiteUrl(e.target.value)}
                className={INPUT} style={INPUT_STYLE} placeholder="Company website URL (optional)" />
            </Field>
          </div>
        )}

        {/* ── Hero tab ── */}
        {activeTab === 'hero' && (
          <div className="">
            <Field label="Hero headline" hint="The big heading on your public board homepage. Select text to highlight in colour.">
              <HeroHeadlineEditor
                value={heroHeadline}
                onChange={html => { setHeroHeadline(html); heroHeadlineRef.current = html }}
                primaryColor={brandColor}
                accentColor={accentColor}
              />
            </Field>
          </div>
        )}

        {/* ── Categories tab ── */}
        {activeTab === 'categories' && (
          <div className="">
            <Field
              label="Category filters"
              hint="One category per line. These drive the job filter chips on your browse page and control which categories candidates can filter by. Leave blank to auto-derive categories from your imported jobs."
            >
              <textarea
                value={categoriesText}
                onChange={e => setCategoriesText(e.target.value)}
                rows={12}
                className={INPUT + ' resize-y leading-relaxed font-mono text-xs'}
                style={INPUT_STYLE}
                placeholder={'Engineering\nProduct\nDesign\nMarketing\nSales\nOperations'}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                {categoriesText.split('\n').filter(l => l.trim()).length} categories
              </p>
            </Field>
          </div>
        )}

        {/* ── Legal tab ── */}
        {activeTab === 'legal' && (
          <div>
            {/* Legal identity */}
            <Field label="Legal / trading name"
              hint="The registered legal name of the board operator. Used in the privacy policy.">
              <input value={privacyLegalName} onChange={e => setPrivacyLegalName(e.target.value)}
                className={INPUT} style={INPUT_STYLE} placeholder="Acme Ltd" />
            </Field>

            <Field label="GDPR / privacy contact email"
              hint="Email for data access, deletion, or privacy queries. Appears in the privacy policy.">
              <input value={privacyEmail} onChange={e => setPrivacyEmail(e.target.value)}
                className={INPUT} style={INPUT_STYLE} placeholder="privacy@acme.com" type="email" />
            </Field>

            <Field label="Board website URL" hint="Used in the privacy policy.">
              <input value={privacyWebsiteUrl} onChange={e => setPrivacyWebsiteUrl(e.target.value)}
                className={INPUT} style={INPUT_STYLE} placeholder="https://jobs.acme.com" />
            </Field>

            {/* About page */}
            <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>About page</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Accessible at /about</p>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  <input type="checkbox" checked={aboutEnabled} onChange={e => setAboutEnabled(e.target.checked)} />
                  Enable
                </label>
              </div>
              {aboutEnabled && <PageContentEditor value={aboutContent} onChange={setAboutContent} />}
            </div>

            {/* Privacy policy */}
            <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Privacy policy</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Accessible at /privacy — populated from your legal details above</p>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  <input type="checkbox" checked={privacyEnabled} onChange={e => setPrivacyEnabled(e.target.checked)} />
                  Enable
                </label>
              </div>
              {privacyEnabled && (
                <Field label="Jurisdiction template">
                  <select value={privacyTemplate} onChange={e => setPrivacyTemplate(e.target.value as PrivacyTemplate)}
                    className={INPUT} style={INPUT_STYLE}>
                    {(Object.entries(TEMPLATE_LABELS) as [PrivacyTemplate, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </div>
        )}

        {/* ── SEO tab ── */}
        {activeTab === 'seo' && (
          <div className="">
            <Field label="Meta title" hint="Shown in browser tabs and search results. Defaults to the board name if blank.">
              <input value={seoMetaTitle} onChange={e => setSeoMetaTitle(e.target.value)}
                className={INPUT} style={INPUT_STYLE} placeholder={`${boardConfig.boardName} Jobs`} />
            </Field>

            <Field label="Meta description" hint="Shown in search results. Keep under 160 characters.">
              <textarea value={seoMetaDescription} onChange={e => setSeoMetaDescription(e.target.value)}
                rows={3} className={INPUT + ' resize-y leading-relaxed'} style={INPUT_STYLE}
                placeholder="Browse open roles at ..." maxLength={200} />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {seoMetaDescription.length} / 160 characters
              </p>
            </Field>

            <Field label="OG image URL" hint="Image shown when shared on social media. Recommended: 1200 × 630px.">
              <input value={seoOgImageUrl} onChange={e => setSeoOgImageUrl(e.target.value)}
                className={INPUT} style={INPUT_STYLE} placeholder="https://..." />
            </Field>

            <Field label="Search engine visibility">
              <label className="flex items-center gap-2 text-sm cursor-pointer p-3 rounded-xl border"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }}>
                <input type="checkbox" checked={seoNoindex} onChange={e => setSeoNoindex(e.target.checked)} />
                <div>
                  <span className="font-semibold">Hide from search engines (noindex)</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    Useful for private, beta, or internal boards.
                  </p>
                </div>
              </label>
            </Field>
          </div>
        )}

        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save content'}
          </button>
        </div>
      </Form>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto"
            style={{
              backgroundColor: toast.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              border: `1px solid ${toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
            }}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
