const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,700&family=Unbounded:wght@700;800;900&display=swap');`;

const JOB = {
  title: "Senior Solidity Engineer",
  company: "Uniswap Labs",
  location: "New York City / Remote",
  remote: "remote",
  type: "Full-time",
  category: "Engineering",
  salaryMin: 180000,
  salaryMax: 240000,
  currency: "USD",
  tags: ["Solidity", "EVM", "DeFi", "TypeScript", "Hardhat"],
  posted: "2h ago",
  description: `
    <p>Uniswap Labs is looking for a Senior Solidity Engineer to work on the next generation of decentralised exchange infrastructure. You'll be core to designing and shipping the smart contracts that power billions in daily trading volume across the most-used DeFi protocol on Earth.</p>
    <h3>What You'll Do</h3>
    <ul>
      <li>Design, implement, and audit production smart contracts on EVM-compatible chains</li>
      <li>Work closely with protocol research and security teams to ensure contract correctness</li>
      <li>Lead code reviews and mentor junior engineers on the contracts team</li>
      <li>Contribute to open-source tooling used across the broader Web3 ecosystem</li>
      <li>Participate in competitive threat modelling and incident response exercises</li>
    </ul>
    <h3>Who You Are</h3>
    <ul>
      <li>5+ years of software engineering experience, with 2+ years writing production Solidity</li>
      <li>Deep familiarity with the EVM, gas optimisation, and assembly-level debugging</li>
      <li>Experience with formal verification tools (Certora, Halmos) is a strong plus</li>
      <li>Strong understanding of DeFi primitives: AMMs, lending protocols, derivatives</li>
      <li>Comfortable working in a fast-moving, async-first distributed team</li>
    </ul>
    <h3>Benefits</h3>
    <ul>
      <li>Competitive salary + meaningful token allocation</li>
      <li>100% remote, async-friendly culture</li>
      <li>Comprehensive health, dental, and vision coverage</li>
      <li>Generous equipment budget and home office stipend</li>
      <li>Annual team offsites and optional NYC office access</li>
    </ul>
  `,
};

const RELATED = [
  { title: "Smart Contract Auditor", company: "Trail of Bits", location: "Remote / Global", salaryMin: 170000, salaryMax: 230000, currency: "USD", remote: "remote", category: "Security" },
  { title: "Protocol Research Engineer", company: "Ethereum Foundation", location: "Remote / Worldwide", salaryMin: 150000, salaryMax: 200000, currency: "USD", remote: "remote", category: "Research" },
  { title: "DevRel Engineer", company: "Chainlink Labs", location: "Remote / Global", salaryMin: 140000, salaryMax: 180000, currency: "USD", remote: "remote", category: "Engineering" },
];

const fmt = (min, max, cur) => {
  const sym = cur === "GBP" ? "£" : "$";
  const k = n => `${sym}${Math.round(n / 1000)}k`;
  return `${k(min)}–${k(max)}`;
};

const badge = r => r === "remote"
  ? { bg: "#E2F4EB", color: "#1B7A4E", label: "Remote" }
  : r === "hybrid"
  ? { bg: "#E2EEFB", color: "#1760C8", label: "Hybrid" }
  : { bg: "#FEF3DC", color: "#C47B00", label: "Onsite" };

const catColor = c => ({
  Engineering: { bg: "#EDE6FF", color: "#4A22D4" },
  Research:    { bg: "#E2EEFB", color: "#1760C8" },
  Design:      { bg: "#FEF3DC", color: "#C47B00" },
  Security:    { bg: "#FFE9E9", color: "#B91C1C" },
  Growth:      { bg: "#E2F4EB", color: "#1B7A4E" },
}[c] || { bg: "#F0EBE3", color: "#7C7067" });

export default function JobDetail() {
  const b  = badge(JOB.remote);
  const cc = catColor(JOB.category);
  const initials = JOB.company.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        .d { --bg:#F0EBE3; --bg2:#E8E1D8; --white:#FAF8F4; --ink:#16120E; --mid:#7C7067; --rule:#D4CBBD; --vio:#6C3BFF; --vio-l:#EDE6FF; --vio-d:#4A22D4; --acc:#F97316;
          min-height:100vh; background:var(--bg); color:var(--ink);
          font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; line-height:1.5;
          -webkit-font-smoothing:antialiased;
        }
        .d * { box-sizing:border-box; margin:0; padding:0; }

        /* NAV */
        .d-nav { display:flex; align-items:center; justify-content:space-between; height:62px; padding:0 48px; background:var(--white); border-bottom:1px solid var(--rule); position:sticky; top:0; z-index:100; }
        .d-logo { display:flex; align-items:center; gap:10px; font-family:'Unbounded',sans-serif; font-weight:800; font-size:13px; cursor:pointer; }
        .d-navlinks { display:flex; align-items:center; gap:2px; }
        .d-nl { font-size:13px; font-weight:500; color:var(--mid); padding:8px 14px; border-radius:10px; border:none; background:none; cursor:pointer; transition:background .1s,color .1s; }
        .d-nl:hover { background:var(--bg); color:var(--ink); }
        .d-postcta { margin-left:6px; border:none; border-radius:10px; padding:9px 20px; background:#16120E; color:#F0EBE3; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:background .15s,transform .15s; }
        .d-postcta:hover { background:var(--acc); transform:translateY(-1px); }

        /* SHELL */
        .d-shell { max-width:1060px; margin:0 auto; padding:36px 24px 80px; }

        /* BACK */
        .d-back { display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--mid); background:var(--white); border:1px solid var(--rule); border-radius:10px; padding:8px 16px; margin-bottom:28px; cursor:pointer; transition:all .12s; }
        .d-back:hover { color:var(--ink); border-color:var(--ink); }

        /* LAYOUT */
        .d-layout { display:grid; grid-template-columns:1fr 320px; gap:20px; align-items:start; }

        /* ── MAIN PANEL ── */
        .d-main { background:var(--white); border:1px solid var(--rule); border-radius:20px; overflow:hidden; }

        .d-header { padding:32px 32px 26px; border-bottom:1px solid var(--rule); }
        .d-breadcrumb { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--mid); margin-bottom:18px; }
        .d-breadcrumb-sep { color:var(--rule); }

        .d-title-row { display:flex; align-items:flex-start; gap:16px; margin-bottom:16px; }
        .d-company-ico { width:52px; height:52px; border-radius:12px; background:var(--bg); border:1px solid var(--rule); display:flex; align-items:center; justify-content:center; font-family:'Unbounded',sans-serif; font-size:14px; font-weight:800; color:var(--mid); flex-shrink:0; }
        .d-title-block { flex:1; min-width:0; }
        .d-h1 { font-family:'Unbounded',sans-serif; font-size:23px; font-weight:800; line-height:1.15; letter-spacing:-0.03em; margin-bottom:8px; }
        .d-company-row { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--mid); flex-wrap:wrap; }
        .d-company-name { font-weight:700; color:var(--ink); }
        .d-dot { width:3px; height:3px; border-radius:50%; background:var(--rule); flex-shrink:0; }

        .d-badge-row { display:flex; gap:6px; flex-wrap:wrap; margin-top:18px; }
        .d-pill { display:inline-block; font-size:11px; font-weight:700; letter-spacing:0.03em; padding:4px 10px; border-radius:7px; }
        .d-pill-outline { background:var(--bg); color:var(--mid); border:1px solid var(--rule); }

        .d-skills-strip { padding:16px 32px; border-bottom:1px solid var(--rule); display:flex; gap:6px; flex-wrap:wrap; background:var(--bg); }
        .d-skill { font-size:11px; font-weight:600; padding:4px 10px; border-radius:7px; background:var(--white); color:var(--mid); border:1px solid var(--rule); }

        /* BODY */
        .d-body { padding:32px; }
        .d-body h3 {
          font-family:'Unbounded',sans-serif; font-size:10px; font-weight:800;
          text-transform:uppercase; letter-spacing:0.12em; color:var(--mid);
          margin:32px 0 14px; padding-top:28px; border-top:1px solid var(--bg2);
        }
        .d-body h3:first-child { margin-top:0; padding-top:0; border-top:none; }
        .d-body p { font-size:14px; line-height:1.9; color:#2E2924; margin-bottom:16px; }
        .d-body ul { padding-left:18px; margin-bottom:0; }
        .d-body li { font-size:14px; line-height:1.8; color:#2E2924; margin-bottom:8px; }
        .d-body li:last-child { margin-bottom:0; }

        /* ── SIDEBAR ── */
        .d-sidebar { display:flex; flex-direction:column; gap:12px; position:sticky; top:80px; }
        .d-sb { background:var(--white); border:1px solid var(--rule); border-radius:18px; padding:22px; }

        .d-sal-big { font-family:'Unbounded',sans-serif; font-size:28px; font-weight:800; letter-spacing:-0.04em; line-height:1.05; margin-bottom:3px; }
        .d-sal-note { font-size:12px; color:var(--mid); margin-bottom:20px; }
        .d-apply { width:100%; border:none; border-radius:12px; background:var(--vio); color:#fff; padding:14px; font-size:14px; font-weight:700; cursor:pointer; margin-bottom:9px; transition:background .15s,transform .15s; font-family:'Plus Jakarta Sans',sans-serif; }
        .d-apply:hover { background:var(--vio-d); transform:translateY(-1px); }
        .d-save { width:100%; border:1.5px solid var(--rule); border-radius:12px; background:transparent; color:var(--mid); padding:11px; font-size:13px; font-weight:600; cursor:pointer; transition:all .12s; font-family:'Plus Jakarta Sans',sans-serif; }
        .d-save:hover { border-color:var(--ink); color:var(--ink); }

        .d-sb-title { font-family:'Unbounded',sans-serif; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:var(--mid); margin-bottom:14px; }
        .d-sb-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--bg2); font-size:13px; }
        .d-sb-row:last-child { border-bottom:none; padding-bottom:0; }
        .d-sb-k { color:var(--mid); }
        .d-sb-v { font-weight:600; color:var(--ink); text-align:right; }

        .d-sb-dark { background:#16120E; border:1px solid #2A251F; border-radius:18px; padding:22px; }
        .d-sb-dark-eyebrow { font-family:'Unbounded',sans-serif; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:rgba(240,235,227,0.35); margin-bottom:10px; }
        .d-sb-dark-body { font-size:13px; font-weight:500; color:#D4CBBD; line-height:1.7; margin-bottom:18px; }
        .d-sb-dark-body em { font-style:normal; color:var(--acc); font-weight:700; }
        .d-sb-dark-btn { width:100%; border:none; border-radius:10px; background:var(--acc); color:#fff; padding:12px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:opacity .12s; }
        .d-sb-dark-btn:hover { opacity:0.85; }

        /* RELATED */
        .d-related-title { font-family:'Unbounded',sans-serif; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:var(--mid); margin-bottom:10px; }
        .d-related-list { display:flex; flex-direction:column; gap:7px; }
        .d-related-row { display:flex; justify-content:space-between; align-items:center; background:var(--white); border:1px solid var(--rule); border-radius:12px; padding:13px 15px; cursor:pointer; transition:border-color .12s,box-shadow .12s; }
        .d-related-row:hover { border-color:var(--vio); box-shadow:0 2px 12px rgba(108,59,255,.07); }
        .d-related-t { font-family:'Unbounded',sans-serif; font-size:11px; font-weight:700; margin-bottom:3px; }
        .d-related-m { font-size:11px; color:var(--mid); }

        /* FOOTER */
        .d-footer { border-top:1px solid var(--rule); padding:24px 48px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; }
        .d-f-logo { display:flex; align-items:center; gap:8px; font-family:'Unbounded',sans-serif; font-size:12px; font-weight:800; }
        .d-f-links { display:flex; gap:20px; }
        .d-f-links a { font-size:12px; font-weight:600; color:var(--mid); cursor:pointer; }
        .d-f-copy { font-size:11px; font-weight:600; color:var(--rule); }

        @media (max-width:860px) {
          .d-nav { padding:0 20px; }
          .d-shell { padding:24px 16px 60px; }
          .d-layout { grid-template-columns:1fr; }
          .d-sidebar { position:static; }
          .d-footer { padding:24px 20px; }
        }
      `}</style>

      <div className="d">
        {/* NAV */}
        <nav className="d-nav">
          <div className="d-logo">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="3" fill="#6C3BFF" />
              <circle cx="14" cy="14" r="7" stroke="#6C3BFF" strokeWidth="2" fill="none" strokeDasharray="3 2" />
              <circle cx="14" cy="14" r="12" stroke="#D4CBBD" strokeWidth="1.5" fill="none" />
            </svg>
            JOBUKI
          </div>
          <div className="d-navlinks">
            <button className="d-nl">Browse</button>
            <button className="d-nl">Companies</button>
            <button className="d-nl">Salaries</button>
            <button className="d-postcta">Post a role ↗</button>
          </div>
        </nav>

        <div className="d-shell">
          {/* BACK */}
          <button className="d-back">← Back to all roles</button>

          <div className="d-layout">

            {/* ── MAIN ── */}
            <main className="d-main">

              {/* Header */}
              <div className="d-header">
                <div className="d-breadcrumb">
                  <span>Jobs</span>
                  <span className="d-breadcrumb-sep">›</span>
                  <span style={{ color: cc.color }}>{JOB.category}</span>
                  <span className="d-breadcrumb-sep">›</span>
                  <span style={{ color: "var(--ink)" }}>{JOB.title}</span>
                </div>

                <div className="d-title-row">
                  <div className="d-company-ico">{initials}</div>
                  <div className="d-title-block">
                    <h1 className="d-h1">{JOB.title}</h1>
                    <div className="d-company-row">
                      <span className="d-company-name">{JOB.company}</span>
                      <span className="d-dot" />
                      <span>{JOB.location}</span>
                      <span className="d-dot" />
                      <span style={{ fontWeight: 600, color: "var(--rule)" }}>{JOB.posted}</span>
                    </div>
                  </div>
                </div>

                <div className="d-badge-row">
                  <span className="d-pill" style={{ background: cc.bg, color: cc.color }}>{JOB.category}</span>
                  <span className="d-pill" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                  <span className="d-pill d-pill-outline">{JOB.type}</span>
                  <span className="d-pill d-pill-outline">{fmt(JOB.salaryMin, JOB.salaryMax, JOB.currency)}</span>
                </div>
              </div>

              {/* Skills strip */}
              <div className="d-skills-strip">
                {JOB.tags.map(t => <span key={t} className="d-skill">{t}</span>)}
              </div>

              {/* Description */}
              <div className="d-body" dangerouslySetInnerHTML={{ __html: JOB.description }} />

            </main>

            {/* ── SIDEBAR ── */}
            <aside className="d-sidebar">

              {/* Apply */}
              <div className="d-sb">
                <div className="d-sal-big">{fmt(JOB.salaryMin, JOB.salaryMax, JOB.currency)}</div>
                <div className="d-sal-note">per year · {JOB.currency}</div>
                <button className="d-apply">Apply now →</button>
                <button className="d-save">Save role</button>
              </div>

              {/* Details */}
              <div className="d-sb">
                <div className="d-sb-title">Details</div>
                {[
                  ["Company",    JOB.company],
                  ["Location",   JOB.location],
                  ["Work style", b.label],
                  ["Type",       JOB.type],
                  ["Category",   JOB.category],
                  ["Posted",     JOB.posted],
                ].map(([k, v]) => (
                  <div key={k} className="d-sb-row">
                    <span className="d-sb-k">{k}</span>
                    <span className="d-sb-v">{v}</span>
                  </div>
                ))}
              </div>

              {/* Post CTA */}
              <div className="d-sb-dark">
                <div className="d-sb-dark-eyebrow">Hiring?</div>
                <div className="d-sb-dark-body">
                  Reach <em>40,000+</em> Web3 engineers looking for their next role right now.
                </div>
                <button className="d-sb-dark-btn">Post a role →</button>
              </div>

              {/* Related */}
              <div>
                <div className="d-related-title">Similar roles</div>
                <div className="d-related-list">
                  {RELATED.map(j => {
                    const rb = badge(j.remote);
                    const rc = catColor(j.category);
                    return (
                      <div key={j.title} className="d-related-row">
                        <div>
                          <div className="d-related-t">{j.title}</div>
                          <div className="d-related-m">{j.company} · {j.location}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                            {fmt(j.salaryMin, j.salaryMax, j.currency)}
                          </div>
                          <span className="d-pill" style={{ background: rb.bg, color: rb.color, fontSize: 10, padding: "2px 7px", borderRadius: 5 }}>
                            {rb.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </aside>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="d-footer">
          <div className="d-f-logo">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6C3BFF", display: "inline-block" }} />
            JOBUKI
          </div>
          <div className="d-f-links">
            {["Browse","Companies","Salaries","Employers","About","Privacy"].map(l => (
              <a key={l}>{l}</a>
            ))}
          </div>
          <div className="d-f-copy">© 2026 Saoir Ltd</div>
        </footer>
      </div>
    </>
  );
}
