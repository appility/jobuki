const AUDIENCES = [
  {
    id: "recruiters",
    icon: "👤",
    title: "For recruiters",
    body: "Spin up a branded board per client, manage pipelines, and share shortlists without spreadsheets.",
    cta: "Explore recruiter boards",
    iconBg: "#ece9fd", iconColor: "#4b35d6", linkColor: "#4b35d6",
  },
  {
    id: "companies",
    icon: "🏢",
    title: "For companies",
    body: "Put your careers page on your own domain, match your brand, and run applications in one place.",
    cta: "Explore company boards",
    iconBg: "#fdeee4", iconColor: "#e8643c", linkColor: "#e8643c",
  },
  {
    id: "communities",
    icon: "👥",
    title: "For communities",
    body: "Launch a niche board for your audience — crypto, AI, or any vertical — and monetise listings.",
    cta: "Explore community boards",
    iconBg: "#e6f6f0", iconColor: "#3ec9a0", linkColor: "#2fa886",
  },
];

export function Audience() {
  return (
    <section className="audience wrap">
      <p className="sec-eyebrow">Choose your audience</p>
      <h2 className="sec-title">One platform, three ways to hire</h2>
      <div className="aud-grid">
        {AUDIENCES.map((a) => (
          <a className="aud-card" href={`/boards/${a.id}`} key={a.id}>
            <span className="aud-icon" style={{ background: a.iconBg, color: a.iconColor }} aria-hidden>
              {a.icon}
            </span>
            <h3>{a.title}</h3>
            <p>{a.body}</p>
            <span className="aud-link" style={{ color: a.linkColor }}>{a.cta} →</span>
          </a>
        ))}
      </div>
    </section>
  );
}
