import type { LinksFunction, MetaFunction } from "react-router";
import { Hero } from "~/components/Hero";
import { Audience } from "~/components/Audience";
import landingStyles from "~/styles/landing.css?url";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href:
      "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800" +
      "&family=Plus+Jakarta+Sans:wght@400;500;600;700" +
      "&family=Space+Grotesk:wght@500;700" +
      "&family=Fraunces:opsz,wght@9..144,500;9..144,700" +
      "&family=DM+Mono:wght@500" +
      "&family=Newsreader:opsz,wght@6..72,400;6..72,600" +
      "&family=Inter:wght@400;500;600" +
      "&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
  },
  { rel: "stylesheet", href: landingStyles },
];

export const meta: MetaFunction = () => [
  { title: "Jobuki — Build a branded job board in minutes" },
  {
    name: "description",
    content:
      "Jobuki gives recruiters, companies, and communities a branded job board on their own domain, with hiring workflows tuned to how they work. No code.",
  },
];

export default function Landing() {
  return (
    <>
      <nav className="nav">
        <div className="logo">
          <span className="dot" />
          Jobuki
        </div>
        <div className="nav-links">
          <a href="/boards">Boards</a>
          <a href="/pricing">Pricing</a>
          <a href="/docs">Docs</a>
          <a href="/create" className="nav-cta">Create your board</a>
        </div>
      </nav>

      <Hero />
      <Audience />

      <section className="wrap">
        <div className="cta-strip">
          <h2>Your board could be live before lunch.</h2>
          <p>Pick a theme, point your domain, post your first role.</p>
          <a href="/create" className="btn-primary">Create your board →</a>
        </div>
      </section>

      <footer className="footer">© 2026 Jobuki · A Saoir product</footer>
    </>
  );
}
