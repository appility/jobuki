export default function PosterBillingPage() {
  return (
    <section className="card p-6 md:p-8">
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
        Billing
      </h1>
      <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
        Manage payment methods, invoices, and posting credits.
      </p>

      <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Billing integration is the next step in the poster flow.
        </p>
      </div>
    </section>
  )
}
