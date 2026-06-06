export default function Nav() {
  return (
    <nav className="nav-root">
      <div className="nav-logo">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <circle cx="15" cy="15" r="4" fill="var(--color-accent-500)" />
          <circle cx="15" cy="15" r="9" stroke="var(--color-accent-500)" strokeWidth="2" fill="none" />
          <circle cx="15" cy="15" r="13.5" stroke="var(--color-primary-400)" strokeWidth="1.5" fill="none" />
          <path d="M15 1.5v3M28.5 15h-3M15 28.5v-3M1.5 15h3"
            stroke="var(--color-primary-400)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        TECH ROUNDABOUT
      </div>
      <div className="flex items-center gap-0.5">
        <a href="#" className="nav-link">Browse</a>
        <a href="#" className="nav-link">Companies</a>
        <a href="#" className="nav-link">Salaries</a>
        <button className="nav-cta">Post a role ↗</button>
      </div>
    </nav>
  )
}
