import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'outline' | 'danger' | 'ghost'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  danger:  'btn-danger',
  ghost:   'btn-ghost',
}

const SIZE_CLASS: Record<Size, string> = {
  xs: 'px-3 py-1.5 text-xs',
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  loadingText?: string
  /** For form submit buttons with multiple intents */
  name?: string
  value?: string
}

export function Button({
  variant = 'primary',
  size = 'sm',
  loading = false,
  loadingText,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} inline-flex items-center justify-center gap-2 ${className}`}
    >
      {loading && (
        <span
          className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}
