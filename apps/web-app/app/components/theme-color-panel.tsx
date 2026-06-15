import { isDarkBackground, getNeutralPalette, LIGHT_NEUTRALS, DARK_NEUTRALS, contrastRatio, isValidHex } from '../lib/color'
import type { BoardTheme } from '@jobuki/types'

interface ThemeColorPanelProps {
  theme: BoardTheme
  onUpdate: (key: keyof BoardTheme, value: string) => void
}

function ColorInput({ label, value, onChange, contrastBg }: { label: string; value: string; onChange: (v: string) => void; contrastBg?: string }) {
  let contrastStatus = ''
  if (contrastBg && isValidHex(value) && isValidHex(contrastBg)) {
    const ratio = contrastRatio(value, contrastBg)
    contrastStatus = ratio >= 4.5 ? '✓ Good' : ratio >= 3 ? '⚠ Fair' : '✗ Poor'
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>
          {label}
        </label>
        {contrastStatus && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: contrastStatus.includes('Good') ? '#16A34A' : contrastStatus.includes('Fair') ? '#D97706' : '#DC2626' }}>
            {contrastStatus}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '2.5rem', height: '2.5rem', border: '1px solid var(--color-border)', borderRadius: '0.375rem', cursor: 'pointer' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          style={{
            flex: 1,
            padding: '0.375rem 0.5rem',
            border: '1px solid var(--color-border)',
            borderRadius: '0.375rem',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
          }}
        />
      </div>
    </div>
  )
}

export function ThemeColorPanel({ theme, onUpdate }: ThemeColorPanelProps) {
  const isDark = isDarkBackground(theme.colorBackground)
  const neutralPalette = getNeutralPalette(theme.colorBackground)

  const handleAutoNeutral = () => {
    onUpdate('colorTextPrimary', neutralPalette.textPrimary)
    onUpdate('colorTextSecondary', neutralPalette.textSecondary)
    onUpdate('colorTextMuted', neutralPalette.textMuted)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Brand Colors ── */}
      <section>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
          Brand Colors
        </h3>
        <ColorInput
          label="Primary"
          value={theme.colorPrimary}
          onChange={(v) => onUpdate('colorPrimary', v)}
        />
        <ColorInput
          label="Primary Foreground"
          value={theme.colorPrimaryFg}
          onChange={(v) => onUpdate('colorPrimaryFg', v)}
          contrastBg={theme.colorPrimary}
        />
        <ColorInput
          label="Accent"
          value={theme.colorAccent}
          onChange={(v) => onUpdate('colorAccent', v)}
        />
        <ColorInput
          label="Accent Foreground"
          value={theme.colorAccentFg}
          onChange={(v) => onUpdate('colorAccentFg', v)}
          contrastBg={theme.colorAccent}
        />
      </section>

      {/* ── Backgrounds ── */}
      <section>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
          Backgrounds
        </h3>
        <ColorInput
          label="Main Background"
          value={theme.colorBackground}
          onChange={(v) => onUpdate('colorBackground', v)}
        />
        <div style={{ padding: '0.75rem', backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))', borderRadius: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          {isDark ? '🌙 Dark background detected — text colors set to light' : '☀️ Light background detected — text colors set to dark'}
        </div>
        <ColorInput
          label="Surface"
          value={theme.colorSurface}
          onChange={(v) => onUpdate('colorSurface', v)}
        />
        <ColorInput
          label="Surface Subtle"
          value={theme.colorSurfaceSubtle}
          onChange={(v) => onUpdate('colorSurfaceSubtle', v)}
        />
      </section>

      {/* ── Text Colors (with smart neutral toggle) ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            Text Colors
          </h3>
          <button
            type="button"
            onClick={handleAutoNeutral}
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.375rem 0.75rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Auto-adjust
          </button>
        </div>
        <ColorInput
          label="Primary Text"
          value={theme.colorTextPrimary}
          onChange={(v) => onUpdate('colorTextPrimary', v)}
          contrastBg={theme.colorBackground}
        />
        <ColorInput
          label="Secondary Text"
          value={theme.colorTextSecondary}
          onChange={(v) => onUpdate('colorTextSecondary', v)}
          contrastBg={theme.colorBackground}
        />
        <ColorInput
          label="Muted Text"
          value={theme.colorTextMuted}
          onChange={(v) => onUpdate('colorTextMuted', v)}
          contrastBg={theme.colorBackground}
        />
      </section>

      {/* ── Borders ── */}
      <section>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
          Borders
        </h3>
        <ColorInput
          label="Border"
          value={theme.colorBorder}
          onChange={(v) => onUpdate('colorBorder', v)}
        />
        <ColorInput
          label="Border Strong"
          value={theme.colorBorderStrong}
          onChange={(v) => onUpdate('colorBorderStrong', v)}
        />
      </section>
    </div>
  )
}
