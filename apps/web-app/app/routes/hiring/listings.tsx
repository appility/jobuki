export default function PosterListingsPage() {
  return (
    <section className="card p-6 md:p-8">
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
        Listings
      </h1>
      <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
        Create, edit, and track paid job listings from this section.
      </p>

      <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No listings yet. Listing submission tools are next.
        </p>
      </div>
    </section>
  )
}
