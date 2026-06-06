import type { Config } from 'tailwindcss'

/**
 * Tech Roundabout — Tailwind Config
 *
 * Every value here references a CSS variable from globals.css.
 * Change the CSS variable → changes everywhere in the design.
 *
 * Colour naming:
 *   primary-*  = the warm stone neutral scale (bg, surfaces, text)
 *   accent-*   = the violet action colour scale
 *   All other tokens (radius, shadow, border, spacing) are semantic.
 */

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],

  theme: {
    extend: {

      /* ── COLOURS ───────────────────────────────────────────────── */
      colors: {

        /* Primary scale — points at CSS vars */
        primary: {
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },

        /* Accent scale */
        accent: {
          DEFAULT: 'var(--color-accent-500)',
          50:  'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
        },

        /* Semantic surface aliases — use these in components */
        bg:           'var(--color-bg)',
        surface:      'var(--color-surface)',
        'surface-alt':'var(--color-surface-alt)',
        border:       'var(--color-border)',
        text:         'var(--color-text)',
        muted:        'var(--color-text-muted)',
        faint:        'var(--color-text-faint)',
      },

      /* ── BORDER RADIUS ─────────────────────────────────────────── */
      /* All driven by CSS vars — change --radius-* to restyle globally */
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
        // override defaults too so rounded-lg = our lg
        DEFAULT: 'var(--radius-md)',
      },

      /* ── BORDER WIDTH ──────────────────────────────────────────── */
      borderWidth: {
        DEFAULT:  'var(--border-width)',
        thin:     'var(--border-width-thin)',
        brutalist:'var(--border-width)',       // alias for clarity
      },

      /* ── BOX SHADOW ────────────────────────────────────────────── */
      /* Offset shadow size driven by --shadow-offset CSS var */
      boxShadow: {
        sm:     'var(--shadow-sm)',
        md:     'var(--shadow-md)',
        lg:     'var(--shadow-lg)',
        accent: 'var(--shadow-accent)',
        none:   'none',
      },

      /* ── TYPOGRAPHY ────────────────────────────────────────────── */
      fontFamily: {
        display: ['var(--font-display)'],
        body:    ['var(--font-body)'],
        // make 'sans' point at body font
        sans:    ['var(--font-body)'],
      },

      /* ── LETTER SPACING ────────────────────────────────────────── */
      letterSpacing: {
        tightest: '-0.04em',
        tighter:  '-0.035em',
        tight:    '-0.025em',
        normal:   '0em',
        wide:     '0.02em',
        wider:    '0.06em',
        widest:   '0.1em',
        caps:     '0.12em',
      },

      /* ── SPACING ───────────────────────────────────────────────── */
      /* Page gutter and card padding driven by CSS vars */
      spacing: {
        gutter: 'var(--page-gutter)',
        card:   'var(--card-pad)',
      },

      /* ── FONT SIZE ─────────────────────────────────────────────── */
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.4', letterSpacing: '0.1em' }],
        xs:    ['11px', { lineHeight: '1.5' }],
        sm:    ['12px', { lineHeight: '1.5' }],
        base:  ['13px', { lineHeight: '1.5' }],
        md:    ['14px', { lineHeight: '1.5' }],
        lg:    ['15px', { lineHeight: '1.4' }],
        xl:    ['17px', { lineHeight: '1.3' }],
        '2xl': ['20px', { lineHeight: '1.2' }],
        '3xl': ['24px', { lineHeight: '1.1' }],
        '4xl': ['32px', { lineHeight: '1.05' }],
        '5xl': ['48px', { lineHeight: '1.0' }],
        hero:  ['clamp(38px, 5.2vw, 64px)', { lineHeight: '1.05' }],
      },

      /* ── GRID ──────────────────────────────────────────────────── */
      gridTemplateColumns: {
        'bento-12': 'repeat(12, minmax(0, 1fr))',
        'hero':     '1fr 420px',
        'footer':   'auto 1fr auto',
      },
    },
  },

  plugins: [],
}

export default config
