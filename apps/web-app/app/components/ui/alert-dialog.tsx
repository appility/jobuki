import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type * as React from 'react'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger
export const AlertDialogPortal = AlertDialogPrimitive.Portal
export const AlertDialogTitle = AlertDialogPrimitive.Title
export const AlertDialogDescription = AlertDialogPrimitive.Description
export const AlertDialogCancel = AlertDialogPrimitive.Cancel

export function AlertDialogContent({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogPrimitive.Overlay
        className="fixed inset-0 z-[60]"
        style={{ backgroundColor: 'rgba(28, 25, 23, 0.45)' }}
      />
      <AlertDialogPrimitive.Content
        className="fixed left-1/2 top-1/2 z-[70] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
}

export function AlertDialogFooter({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
}

export function AlertDialogAction({
  children,
  className,
  asChild,
}: {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}) {
  return (
    <AlertDialogPrimitive.Action
      asChild={asChild}
      className={`inline-flex items-center justify-center rounded-lg border-0 px-3 py-2 text-sm font-semibold ${className ?? ''}`}
      style={{
        backgroundColor: 'var(--color-danger)',
        color: 'white',
      }}
    >
      {children}
    </AlertDialogPrimitive.Action>
  )
}
