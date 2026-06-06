import Nav from './components/Nav'
import LivePill from './components/LivePill'
import SearchBar from './components/SearchBar'
import HeroPanel from './components/HeroPanel'
import FilterBar from './components/FilterBar'
import BentoGrid from './components/BentoGrid'

export default function Home() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <div className="grid grid-cols-[1fr_420px] gap-7 px-gutter pt-14 pb-11 max-w-[1280px] mx-auto">
        <div>
          <LivePill />
          <h1 className="hero-h1 animate-pop [animation-delay:0.08s]">
            Your <span className="text-accent">next role</span><br />
            is right here.<br />
            <span className="text-faint">No middlemen.</span>
          </h1>
          <p className="text-md text-muted leading-[1.75] font-light max-w-[460px] mb-8 animate-pop [animation-delay:0.16s]">
            Every serious tech job in the UK. No agency markup,<br />
            no recruiter walls. Apply direct — always.
          </p>
          <div className="animate-pop [animation-delay:0.22s]">
            <SearchBar />
          </div>
        </div>

        <HeroPanel />
      </div>

      <FilterBar />

      {/* Bento header */}
      <div className="flex justify-between items-center px-gutter mb-3.5 max-w-[1280px] mx-auto">
        <div className="font-display font-bold text-[12px] tracking-wide">ALL ROLES</div>
        <div className="text-sm font-semibold text-muted">2,847 matched</div>
      </div>

      <BentoGrid />

      {/* Load more */}
      <div className="flex justify-center px-gutter pb-20 max-w-[1280px] mx-auto">
        <button className="load-more">Load 25 more roles →</button>
      </div>

      {/* Footer */}
      <footer className="footer-root">
        <div className="footer-logo">
          <div className="w-2 h-2 rounded-full bg-accent" />
          TECH ROUNDABOUT
        </div>
        <div className="flex gap-5 flex-wrap">
          {['Browse','Companies','Salaries','Employers','About','Privacy'].map(l => (
            <a key={l} href="#" className="footer-link">{l}</a>
          ))}
        </div>
        <div className="text-xs text-faint font-semibold">© 2025 Tech Roundabout Ltd</div>
      </footer>
    </>
  )
}
