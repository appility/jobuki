export default function PosterStatusPage() {
  return (
    <section className="card p-6 md:p-8">
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
        Status
      </h1>
      <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
        Review listing status updates such as pending review, approved, published, and rejected.
      </p>

      <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Status timeline and notifications will appear here.
        </p>
      </div>
    </section>
  )
}
