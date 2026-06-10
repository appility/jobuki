export default function HiringApplicationsPage() {
  return (
    <section className="card p-6 md:p-8">
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
        Applications
      </h1>
      <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
        View and manage applications received for your job listings.
      </p>

      <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No applications yet.
        </p>
      </div>
    </section>
  )
}
