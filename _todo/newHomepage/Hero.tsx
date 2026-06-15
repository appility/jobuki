import { useState } from "react";

// Marketing-only theme presets for the landing-page preview widget.
// Self-contained: not connected to the app's real theme editor.
const PRESETS = [
  {
    name: "Minimal",
    swatch: "#5b3df5",
    accent: "#5b3df5",
    display: "'Unbounded', sans-serif",
    body: "'Plus Jakarta Sans', sans-serif",
    radius: "13px",
    brand: "Northwind",
    domain: "careers.yourbrand.com",
    bg: "#ffffff", bar: "#faf8f5", chip: "#ffffff", border: "#e7e0d6",
    text: "#1c1a17", soft: "#6b6459", dot: "#e7e0d6",
  },
  {
    name: "Editorial",
    swatch: "#e8643c",
    accent: "#e8643c",
    display: "'Fraunces', serif",
    body: "'Newsreader', serif",
    radius: "20px",
    brand: "Maker & Co",
    domain: "jobs.maker.co",
    bg: "#fdf8f3", bar: "#f9efe6", chip: "#fffdfb", border: "#efdfd1",
    text: "#2a1c14", soft: "#8a6f5e", dot: "#e7cdb9",
  },
  {
    name: "Community",
    swatch: "#3ec9a0",
    accent: "#2fa886",
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    radius: "8px",
    brand: "DevHub",
    domain: "hiring.devhub.io",
    bg: "#f5fbf9", bar: "#eaf6f1", chip: "#ffffff", border: "#d4ece2",
    text: "#10241d", soft: "#5a7068", dot: "#c4e6d9",
  },
  {
    name: "Technical",
    swatch: "#1c1a17",
    accent: "#7c6bff", // brighter violet so it reads on the dark surface
    display: "'DM Mono', monospace",
    body: "'IBM Plex Sans', sans-serif",
    radius: "2px",
    brand: "studio_os",
    domain: "work.studio.com",
    bg: "#16151a", bar: "#1f1d24", chip: "#211f28", border: "#322f3c",
    text: "#f2f0f7", soft: "#9a96a8", dot: "#3a3744",
  },
] as const;

type Preset = (typeof PRESETS)[number];

const JOBS = [
  { title: "Senior Product Designer", meta: "Remote · Full-time", pay: "£75k", grad: "linear-gradient(135deg,#ffd9b3,#ff9e57)" },
  { title: "Backend Engineer", meta: "London · Hybrid", pay: "£90k", grad: "linear-gradient(135deg,#c8c2ff,#5b3df5)" },
  { title: "Growth Marketer", meta: "Berlin · Full-time", pay: "€68k", grad: "linear-gradient(135deg,#b6e8d8,#3ec9a0)" },
];

function boardVars(p: Preset): React.CSSProperties {
  return {
    "--board-accent": p.accent,
    "--board-font": p.display,
    "--board-body-font": p.body,
    "--board-radius": p.radius,
    "--board-bg": p.bg,
    "--board-bar": p.bar,
    "--board-chip": p.chip,
    "--board-border": p.border,
    "--board-text": p.text,
    "--board-soft": p.soft,
    "--board-dot": p.dot,
  } as React.CSSProperties;
}

export function Hero() {
  const [theme, setTheme] = useState<Preset>(PRESETS[0]);

  return (
    <header className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Hiring platform</span>
          <h1>
            Build a branded
            <br />
            job board <span className="accent">in minutes.</span>
          </h1>
          <p className="lede">
            Jobuki gives recruiters, companies, and communities a board that
            looks like theirs — with hiring workflows tuned to how they
            actually work.
          </p>
          <div className="hero-actions">
            <a href="/create" className="btn-primary">Create your board →</a>
            <a href="/boards" className="btn-ghost">See live boards</a>
          </div>
          <p className="trust">
            Your domain, your theme, your rules — <b>no code.</b>
          </p>
        </div>

        <div className="preview">
          <div className="board" style={boardVars(theme)}>
            <div className="board-bar">
              <i /><i /><i />
              <span className="board-url">{theme.domain}</span>
            </div>
            <div className="board-body">
              <div className="board-head">
                <div className="board-brand">
                  <span className="board-logo" aria-hidden />
                  <span className="board-title">{theme.brand}</span>
                </div>
                <span className="board-pill">12 live</span>
              </div>
              {JOBS.map((job) => (
                <div className="job" key={job.title}>
                  <span className="job-ico" style={{ background: job.grad }} />
                  <span className="job-meta">
                    <b>{job.title}</b>
                    <span>{job.meta}</span>
                  </span>
                  <span className="job-tag">{job.pay}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="theme-row" role="radiogroup" aria-label="Preview theme">
            <span className="theme-name">{theme.name}</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                role="radio"
                aria-checked={p.name === theme.name}
                aria-label={`${p.name} theme`}
                className={`sw${p.name === theme.name ? " active" : ""}`}
                style={{ background: p.swatch }}
                onClick={() => setTheme(p)}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
