import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // All public board colours reference CSS variables
      // so the entire theme is driven by per-board token injection
      colors: {
        primary:    'var(--color-primary)',
        'primary-fg': 'var(--color-primary-fg)',
        accent:     'var(--color-accent)',
        'accent-fg':'var(--color-accent-fg)',
        background: 'var(--color-background)',
        surface:    'var(--color-surface)',
        'surface-subtle': 'var(--color-surface-subtle)',
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted':     'var(--color-text-muted)',
        border:           'var(--color-border)',
        'border-strong':  'var(--color-border-strong)',
        success:          'var(--color-success)',
        'success-bg':     'var(--color-success-bg)',
        warning:          'var(--color-warning)',
        'warning-bg':     'var(--color-warning-bg)',
        danger:           'var(--color-danger)',
        'danger-bg':      'var(--color-danger-bg)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body:    'var(--font-body)',
        mono:    'var(--font-mono)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
    },
  },
  plugins: [],
} satisfies Config
