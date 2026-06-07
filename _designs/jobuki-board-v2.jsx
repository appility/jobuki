import { useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,700&family=Unbounded:wght@700;800;900&display=swap');`;

const JOBS = [
  {
    id: "1",
    title: "Senior Solidity Engineer",
    company: "Uniswap Labs",
    location: "New York City / Remote",
    remote: "remote",
    type: "Full-time",
    category: "Engineering",
    salaryMin: 180000,
    salaryMax: 240000,
    currency: "USD",
    tags: ["Solidity", "EVM", "DeFi", "TypeScript"],
    posted: "2h ago",
    description: `<p>Uniswap Labs is looking for a Senior Solidity Engineer to work on the next generation of decentralised exchange infrastructure. You'll be core to designing and shipping the smart contracts that power billions in daily trading volume.</p><h3>What You'll Do</h3><ul><li>Design, implement, and audit production smart contracts on EVM-compatible chains</li><li>Work closely with protocol research and security teams to ensure contract correctness</li><li>Lead code reviews and mentor junior engineers</li><li>Contribute to open-source tooling used across the broader Web3 ecosystem</li><li>Participate in competitive threat modelling and incident response exercises</li></ul><h3>Who You Are</h3><ul><li>5+ years of software engineering experience, with 2+ years writing production Solidity</li><li>Deep familiarity with the EVM, gas optimisation, and assembly</li><li>Experience with formal verification tools (Certora, Halmos) is a plus</li><li>Strong understanding of DeFi primitives: AMMs, lending protocols, derivatives</li><li>Comfortable working in a fast-moving, async-first distributed team</li></ul><h3>Benefits</h3><ul><li>Competitive salary + meaningful token allocation</li><li>100% remote, async-friendly culture</li><li>Comprehensive health, dental, and vision</li><li>Generous equipment budget and home office stipend</li></ul>`,
  },
  {
    id: "2",
    title: "Protocol Research Engineer",
    company: "Ethereum Foundation",
    location: "Remote / Worldwide",
    remote: "remote",
    type: "Full-time",
    category: "Research",
    salaryMin: 150000,
    salaryMax: 200000,
    currency: "USD",
    tags: ["Python", "Cryptography", "ZK Proofs", "Rust"],
    posted: "4h ago",
    description: `<p>The Ethereum Foundation is seeking a Protocol Research Engineer to work on core Ethereum research — from consensus layer improvements to cryptographic primitives underpinning the next generation of the network.</p><h3>Responsibilities</h3><ul><li>Research and prototype improvements to the Ethereum consensus and execution layers</li><li>Collaborate with external academic researchers and client teams</li><li>Write technical posts and EIPs to communicate findings to the community</li><li>Contribute to open-source implementations and test suites</li></ul><h3>Requirements</h3><ul><li>Strong background in distributed systems and/or cryptography</li><li>Experience with Python and Rust for protocol simulation and implementation</li><li>Familiarity with ZK proof systems (SNARKs, STARKs) is highly desirable</li><li>Track record of meaningful open-source contributions</li></ul>`,
  },
  {
    id: "3",
    title: "Head of Growth",
    company: "Aave",
    location: "London, UK",
    remote: "hybrid",
    type: "Full-time",
    category: "Growth",
    salaryMin: 120000,
    salaryMax: 160000,
    currency: "GBP",
    tags: ["DeFi", "B2B Growth", "Partnerships", "Analytics"],
    posted: "6h ago",
    description: `<p>Aave is looking for a Head of Growth to drive institutional and retail adoption of the Aave Protocol. You'll own the full growth funnel — from awareness to activation — and work directly with the founding team.</p><h3>What You'll Do</h3><ul><li>Define and execute the growth strategy across B2B and B2C channels</li><li>Build and manage partnerships with protocols, DAOs, and institutional capital</li><li>Own performance marketing, referral programmes, and ecosystem grants</li><li>Work cross-functionally with product, comms, and business development</li></ul><h3>Who You Are</h3><ul><li>5+ years in growth roles, ideally in DeFi or fintech</li><li>Data-driven with strong experience in analytics tooling (Dune, Mixpanel)</li><li>Excellent communicator with a strong network in the Web3 ecosystem</li><li>Comfortable operating in a decentralised, governance-driven environment</li></ul>`,
  },
  {
    id: "4",
    title: "Full-Stack Engineer",
    company: "Coinbase",
    location: "Remote / US",
    remote: "remote",
    type: "Full-time",
    category: "Engineering",
    salaryMin: 160000,
    salaryMax: 210000,
    currency: "USD",
    tags: ["React", "Node.js", "Go", "PostgreSQL"],
    posted: "8h ago",
    description: `<p>Coinbase is hiring a Full-Stack Engineer to work on consumer-facing products used by millions of users worldwide. This is a high-impact role at the intersection of product engineering and financial infrastructure.</p><h3>Responsibilities</h3><ul><li>Build and ship features across web and mobile surfaces using React and React Native</li><li>Work on backend services written in Go and Node.js handling high transaction volumes</li><li>Collaborate with design and product to define the user experience</li><li>Participate in on-call rotations and own reliability of your services</li></ul><h3>Requirements</h3><ul><li>4+ years of professional software engineering experience</li><li>Proficiency in TypeScript, React, and at least one backend language (Go, Python, Node)</li><li>Experience with relational databases (PostgreSQL) and distributed caching</li><li>Passion for financial technology and a basic understanding of blockchain fundamentals</li></ul>`,
  },
  {
    id: "5",
    title: "Smart Contract Auditor",
    company: "Trail of Bits",
    location: "Remote / Global",
    remote: "remote",
    type: "Full-time",
    category: "Security",
    salaryMin: 170000,
    salaryMax: 230000,
    currency: "USD",
    tags: ["Security", "Solidity", "Rust", "Formal Verification"],
    posted: "12h ago",
    description: `<p>Trail of Bits is the world's leading blockchain security firm. You'll audit some of the most critical protocols in DeFi, reviewing code that secures billions of dollars in user assets.</p><h3>What You'll Do</h3><ul><li>Perform security reviews and audits of smart contracts written in Solidity, Rust, and Vyper</li><li>Use manual and automated analysis to discover vulnerabilities</li><li>Produce detailed, actionable audit reports for client teams</li><li>Contribute to open-source security tooling (Slither, Echidna, Medusa)</li></ul><h3>Requirements</h3><ul><li>3+ years in software security or smart contract development</li><li>Deep knowledge of EVM internals and common vulnerability classes</li><li>Experience with fuzzing, static analysis, and formal verification</li><li>Strong written communication — our reports are read by engineers worldwide</li></ul>`,
  },
  {
    id: "6",
    title: "Product Designer",
    company: "Metamask",
    location: "Remote / Global",
    remote: "remote",
    type: "Full-time",
    category: "Design",
    salaryMin: 130000,
    salaryMax: 170000,
    currency: "USD",
    tags: ["Figma", "UX Research", "Web3 UX", "Design Systems"],
    posted: "1d ago",
    description: `<p>MetaMask is the world's most-used self-custodial crypto wallet. We're looking for a Product Designer to help define the future of Web3 onboarding for tens of millions of users.</p><h3>Responsibilities</h3><ul><li>Own end-to-end design for core wallet features — from discovery to shipped</li><li>Conduct user research to understand the needs of crypto newcomers and power users</li><li>Collaborate with engineers to ensure pixel-perfect implementation</li><li>Contribute to and evolve the MetaMask design system</li></ul><h3>Requirements</h3><ul><li>5+ years of product design experience with a portfolio showing end-to-end ownership</li><li>Strong systems thinking — you can design a single component and see the whole</li><li>Experience in or strong curiosity about blockchain/crypto products</li><li>Proficiency in Figma and modern prototyping tools</li></ul>`,
  },
  {
    id: "7",
    title: "DevRel Engineer",
    company: "Chainlink Labs",
    location: "Remote / Global",
    remote: "remote",
    type: "Full-time",
    category: "Engineering",
    salaryMin: 140000,
    salaryMax: 180000,
    currency: "USD",
    tags: ["Solidity", "JavaScript", "Technical Writing", "APIs"],
    posted: "1d ago",
    description: `<p>Chainlink Labs is looking for a Developer Relations Engineer to help onboard the next generation of smart contract developers onto Chainlink's oracle network.</p><h3>What You'll Do</h3><ul><li>Create tutorials, guides, and sample code that help developers integrate Chainlink</li><li>Engage with the developer community on forums, Discord, and at conferences</li><li>Work with product teams to surface developer feedback and pain points</li><li>Build and maintain demo applications that showcase Chainlink's capabilities</li></ul><h3>Requirements</h3><ul><li>Strong experience writing Solidity and JavaScript/TypeScript</li><li>Excellent written and verbal communication skills</li><li>Passion for the developer experience and Web3 ecosystem</li><li>Prior DevRel or open-source contribution experience is a strong plus</li></ul>`,
  },
  {
    id: "8",
    title: "Crypto Compliance Lead",
    company: "Binance",
    location: "Singapore",
    remote: "onsite",
    type: "Full-time",
    category: "Legal & Compliance",
    salaryMin: 110000,
    salaryMax: 150000,
    currency: "USD",
    tags: ["AML", "KYC", "Regulatory Affairs", "FATF"],
    posted: "2d ago",
    description: `<p>Binance is looking for a Compliance Lead to manage regulatory relationships and build scalable compliance programmes across key markets in Asia.</p><h3>Responsibilities</h3><ul><li>Develop and implement AML/KYC policies aligned with local and international regulation</li><li>Act as primary liaison with regulators and government bodies</li><li>Manage a small team of compliance analysts</li><li>Stay ahead of evolving crypto regulation across APAC jurisdictions</li></ul><h3>Requirements</h3><ul><li>7+ years in financial services compliance, ideally in crypto or fintech</li><li>Deep knowledge of FATF guidelines, MAS regulations, and VASP frameworks</li><li>Strong written communication and stakeholder management skills</li><li>CAMS or equivalent certification preferred</li></ul>`,
  },
];

const FILTERS = [
  { id: "all", label: "All roles" },
  { id: "remote", label: "Remote only" },
  { id: "engineering", label: "Engineering" },
  { id: "research", label: "Research" },
  { id: "design", label: "Design" },
  { id: "security", label: "Security" },
];

const CATS = ["All", "Engineering", "Research", "Design", "Growth", "Security", "Legal & Compliance"];

const fmt = (min, max, cur) => {
  const sym = cur === "GBP" ? "£" : "$";
  const k = (n) => `${sym}${Math.round(n / 1000)}k`;
  return `${k(min)}–${k(max)}`;
};

const badge = (remote) => {
  if (remote === "remote") return { bg: "#E2F4EB", color: "#1B7A4E", label: "Remote" };
  if (remote === "hybrid") return { bg: "#E2EEFB", color: "#1760C8", label: "Hybrid" };
  return { bg: "#FEF3DC", color: "#C47B00", label: "Onsite" };
};

const categoryColor = (cat) => {
  const map = {
    Engineering: { bg: "#EDE6FF", color: "#4A22D4" },
    Research: { bg: "#E2EEFB", color: "#1760C8" },
    Design: { bg: "#FEF3DC", color: "#C47B00" },
    Growth: { bg: "#E2F4EB", color: "#1B7A4E" },
    Security: { bg: "#FFE9E9", color: "#B91C1C" },
    "Legal & Compliance": { bg: "#F5F4F2", color: "#7C7067" },
  };
  return map[cat] || { bg: "#F0EBE3", color: "#7C7067" };
};

export default function JobBoard() {
  const [view, setView] = useState("list");
  const [activeJob, setActiveJob] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = JOBS.filter((j) => {
    const q = query.toLowerCase();
    const qMatch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags.some((t) => t.toLowerCase().includes(q));
    const fMatch =
      activeFilter === "all" ||
      (activeFilter === "remote" && j.remote === "remote") ||
      j.category.toLowerCase() === activeFilter;
    return qMatch && fMatch;
  });

  const openJob = (job) => { setActiveJob(job); setView("detail"); window.scrollTo?.(0, 0); };
  const goBack = () => setView("list");

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        .jb { --bg:#F0EBE3; --bg2:#E8E1D8; --white:#FAF8F4; --ink:#16120E; --mid:#7C7067; --rule:#D4CBBD; --vio:#6C3BFF; --vio-l:#EDE6FF; --vio-d:#4A22D4; --acc:#F97316; --grn:#1B7A4E; --grn-l:#E2F4EB; min-height:100vh; background:var(--bg); color:var(--ink); font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased; }
        .jb * { box-sizing:border-box; margin:0; padding:0; }
        .jb a { text-decoration:none; color:inherit; }

        /* NAV */
        .jb-nav { display:flex; align-items:center; justify-content:space-between; height:62px; padding:0 48px; background:var(--white); border-bottom:1px solid var(--rule); position:sticky; top:0; z-index:100; }
        .jb-logo { display:flex; align-items:center; gap:10px; font-family:'Unbounded',sans-serif; font-weight:800; font-size:13px; cursor:pointer; }
        .jb-nav-r { display:flex; align-items:center; gap:2px; }
        .jb-navlink { font-size:13px; font-weight:500; color:var(--mid); padding:8px 14px; border-radius:10px; border:none; background:none; cursor:pointer; transition:background .1s,color .1s; }
        .jb-navlink:hover { background:var(--bg); color:var(--ink); }
        .jb-postcta { margin-left:6px; border:none; border-radius:10px; padding:9px 20px; background:#16120E; color:#F0EBE3; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:background .15s,transform .15s; }
        .jb-postcta:hover { background:var(--acc); transform:translateY(-1px); }

        /* ─── LIST VIEW ─── */
        .jb-list-shell { max-width:980px; margin:0 auto; padding:36px 24px 80px; }

        .jb-page-head { margin-bottom:28px; }
        .jb-page-title { font-family:'Unbounded',sans-serif; font-size:22px; font-weight:800; letter-spacing:-0.03em; margin-bottom:6px; }
        .jb-page-sub { font-size:13px; color:var(--mid); }

        .jb-search-row { display:flex; gap:10px; margin-bottom:20px; }
        .jb-searchbox { flex:1; display:flex; background:var(--white); border:1.5px solid var(--rule); border-radius:12px; overflow:hidden; box-shadow:0 1px 6px rgba(0,0,0,.05); transition:border-color .15s,box-shadow .15s; }
        .jb-searchbox:focus-within { border-color:var(--vio); box-shadow:0 0 0 3px var(--vio-l); }
        .jb-searchbox input { flex:1; border:none; outline:none; padding:12px 16px; font-size:14px; color:var(--ink); background:transparent; font-family:'Plus Jakarta Sans',sans-serif; }
        .jb-searchbox input::placeholder { color:var(--mid); }
        .jb-search-btn { border:none; background:var(--vio); color:#fff; padding:12px 22px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }

        .jb-filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:24px; }
        .jb-chip { font-size:12px; font-weight:700; color:var(--mid); background:var(--white); border:1px solid var(--rule); border-radius:999px; padding:6px 14px; cursor:pointer; transition:all .1s; white-space:nowrap; }
        .jb-chip:hover { border-color:var(--ink); color:var(--ink); }
        .jb-chip.on { background:#16120E; color:#F0EBE3; border-color:#16120E; }

        .jb-results-meta { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .jb-results-count { font-family:'Unbounded',sans-serif; font-size:12px; font-weight:700; }
        .jb-sort { font-size:12px; font-weight:600; color:var(--mid); background:var(--white); border:1px solid var(--rule); border-radius:8px; padding:6px 10px; }

        /* JOB ROW */
        .jb-job-list { display:flex; flex-direction:column; gap:8px; }
        .jb-job-row { display:flex; align-items:center; justify-content:space-between; gap:20px; background:var(--white); border:1px solid var(--rule); border-radius:14px; padding:18px 20px; cursor:pointer; transition:border-color .12s, box-shadow .12s, transform .12s; }
        .jb-job-row:hover { border-color:var(--vio); box-shadow:0 4px 20px rgba(108,59,255,.08); transform:translateY(-1px); }

        .jb-row-left { display:flex; align-items:center; gap:16px; min-width:0; flex:1; }
        .jb-company-ico { width:42px; height:42px; border-radius:10px; background:var(--bg); border:1px solid var(--rule); display:flex; align-items:center; justify-content:center; font-family:'Unbounded',sans-serif; font-size:12px; font-weight:800; color:var(--mid); flex-shrink:0; letter-spacing:-0.02em; }
        .jb-row-info { min-width:0; }
        .jb-row-title { font-family:'Unbounded',sans-serif; font-size:14px; font-weight:700; line-height:1.25; margin-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .jb-row-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:12px; color:var(--mid); }
        .jb-row-company { font-weight:600; color:var(--ink); }
        .jb-row-sep { width:3px; height:3px; border-radius:50%; background:var(--rule); flex-shrink:0; }
        .jb-row-tags { display:flex; gap:5px; flex-wrap:wrap; }
        .jb-row-tag { font-size:11px; font-weight:600; padding:2px 8px; border-radius:6px; background:var(--bg); color:var(--mid); border:1px solid var(--rule); white-space:nowrap; }

        .jb-row-right { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; }
        .jb-row-sal { font-family:'Unbounded',sans-serif; font-size:14px; font-weight:800; letter-spacing:-0.03em; white-space:nowrap; }
        .jb-row-badges { display:flex; gap:6px; align-items:center; }
        .jb-pill { font-size:10px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:3px 8px; border-radius:6px; white-space:nowrap; }
        .jb-cat-pill { }
        .jb-row-ago { font-size:11px; font-weight:600; color:var(--rule); }

        .jb-empty { text-align:center; padding:64px 0; color:var(--mid); }
        .jb-empty-t { font-family:'Unbounded',sans-serif; font-size:14px; font-weight:700; margin-bottom:8px; color:var(--ink); }

        /* ─── DETAIL VIEW ─── */
        .jb-detail-shell { max-width:1060px; margin:0 auto; padding:36px 24px 80px; }

        .jb-back-btn { display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--mid); background:var(--white); border:1px solid var(--rule); border-radius:10px; padding:8px 16px; margin-bottom:32px; cursor:pointer; transition:all .12s; }
        .jb-back-btn:hover { color:var(--ink); border-color:var(--ink); }

        .jb-detail-layout { display:grid; grid-template-columns:1fr 320px; gap:20px; align-items:start; }

        /* MAIN PANEL */
        .jb-detail-main { background:var(--white); border:1px solid var(--rule); border-radius:20px; overflow:hidden; }
        .jb-detail-header { padding:32px 32px 24px; border-bottom:1px solid var(--rule); }
        .jb-detail-breadcrumb { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--mid); margin-bottom:14px; }
        .jb-detail-breadcrumb span { color:var(--rule); }
        .jb-detail-h1 { font-family:'Unbounded',sans-serif; font-size:24px; font-weight:800; line-height:1.15; letter-spacing:-0.03em; margin-bottom:14px; }
        .jb-detail-meta-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:13px; color:var(--mid); margin-bottom:16px; }
        .jb-detail-meta-row strong { color:var(--ink); font-weight:600; }
        .jb-detail-tags { display:flex; gap:6px; flex-wrap:wrap; }
        .jb-detail-tag { font-size:11px; font-weight:600; padding:4px 10px; border-radius:7px; background:var(--bg); color:var(--mid); border:1px solid var(--rule); }

        .jb-detail-body { padding:32px; }
        .jb-detail-body h3 { font-family:'Unbounded',sans-serif; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:var(--mid); margin:0 0 14px; padding:0; }
        .jb-detail-body p { font-size:14px; line-height:1.85; color:#2E2924; margin-bottom:16px; }
        .jb-detail-body ul { padding-left:18px; margin-bottom:20px; }
        .jb-detail-body li { font-size:14px; line-height:1.75; color:#2E2924; margin-bottom:7px; }
        .jb-detail-body section { margin-bottom:32px; }

        /* SIDEBAR */
        .jb-sidebar { display:flex; flex-direction:column; gap:12px; position:sticky; top:82px; }
        .jb-sb-card { background:var(--white); border:1px solid var(--rule); border-radius:20px; padding:22px; }

        .jb-apply-btn { width:100%; border:none; border-radius:12px; background:var(--vio); color:#fff; padding:14px; font-size:14px; font-weight:700; cursor:pointer; margin-bottom:10px; transition:background .15s,transform .15s; font-family:'Plus Jakarta Sans',sans-serif; }
        .jb-apply-btn:hover { background:var(--vio-d); transform:translateY(-1px); }
        .jb-save-btn { width:100%; border:1.5px solid var(--rule); border-radius:12px; background:transparent; color:var(--mid); padding:11px; font-size:13px; font-weight:600; cursor:pointer; transition:all .12s; font-family:'Plus Jakarta Sans',sans-serif; }
        .jb-save-btn:hover { border-color:var(--ink); color:var(--ink); }

        .jb-sal-display { margin-bottom:18px; }
        .jb-sal-big { font-family:'Unbounded',sans-serif; font-size:26px; font-weight:800; letter-spacing:-0.04em; line-height:1.1; margin-bottom:3px; }
        .jb-sal-note { font-size:12px; color:var(--mid); }

        .jb-sb-section-title { font-family:'Unbounded',sans-serif; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:var(--mid); margin-bottom:14px; }
        .jb-sb-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--bg2); font-size:13px; }
        .jb-sb-row:last-child { border-bottom:none; padding-bottom:0; }
        .jb-sb-key { color:var(--mid); }
        .jb-sb-val { font-weight:600; color:var(--ink); text-align:right; }

        .jb-sb-dark { background:#16120E; border:1px solid #2E2924; border-radius:20px; padding:22px; }
        .jb-sb-dark-label { font-family:'Unbounded',sans-serif; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:rgba(240,235,227,0.4); margin-bottom:10px; }
        .jb-sb-dark-body { font-size:13px; font-weight:500; color:#D4CBBD; line-height:1.65; margin-bottom:16px; }
        .jb-sb-dark-body em { font-style:normal; color:var(--acc); font-weight:700; }
        .jb-sb-dark-btn { width:100%; border:none; border-radius:10px; background:var(--acc); color:#fff; padding:12px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:opacity .12s; }
        .jb-sb-dark-btn:hover { opacity:0.88; }

        /* RELATED */
        .jb-related { margin-top:20px; }
        .jb-related-title { font-family:'Unbounded',sans-serif; font-size:12px; font-weight:700; color:var(--mid); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.06em; }
        .jb-related-list { display:flex; flex-direction:column; gap:8px; }
        .jb-related-row { display:flex; justify-content:space-between; align-items:center; background:var(--white); border:1px solid var(--rule); border-radius:12px; padding:14px 16px; cursor:pointer; transition:border-color .12s,box-shadow .12s; }
        .jb-related-row:hover { border-color:var(--vio); box-shadow:0 2px 12px rgba(108,59,255,.07); }
        .jb-related-title-t { font-family:'Unbounded',sans-serif; font-size:12px; font-weight:700; margin-bottom:3px; }
        .jb-related-meta { font-size:11px; color:var(--mid); }

        /* FOOTER */
        .jb-footer { border-top:1px solid var(--rule); padding:24px 48px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .jb-footer-logo { display:flex; align-items:center; gap:8px; font-family:'Unbounded',sans-serif; font-size:12px; font-weight:800; }
        .jb-footer-links { display:flex; gap:20px; }
        .jb-footer-links a { font-size:12px; font-weight:600; color:var(--mid); cursor:pointer; }
        .jb-footer-copy { font-size:11px; font-weight:600; color:var(--rule); }

        @media (max-width:860px) {
          .jb-detail-layout { grid-template-columns:1fr; }
          .jb-sidebar { position:static; }
          .jb-nav { padding:0 20px; }
          .jb-list-shell, .jb-detail-shell { padding-left:16px; padding-right:16px; }
          .jb-footer { padding:24px 20px; }
        }
      `}</style>

      <div className="jb">
        {/* ── NAV ── */}
        <nav className="jb-nav">
          <div className="jb-logo" onClick={goBack}>
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="3" fill="#6C3BFF" />
              <circle cx="14" cy="14" r="7" stroke="#6C3BFF" strokeWidth="2" fill="none" strokeDasharray="3 2" />
              <circle cx="14" cy="14" r="12" stroke="#D4CBBD" strokeWidth="1.5" fill="none" />
            </svg>
            JOBUKI
          </div>
          <div className="jb-nav-r">
            <button className="jb-navlink" onClick={goBack}>Browse</button>
            <button className="jb-navlink">Companies</button>
            <button className="jb-navlink">Salaries</button>
            <button className="jb-postcta">Post a role ↗</button>
          </div>
        </nav>

        {/* ════════════════ LIST VIEW ════════════════ */}
        {view === "list" && (
          <div className="jb-list-shell">
            <div className="jb-page-head">
              <h1 className="jb-page-title">Crypto & Web3 Jobs</h1>
              <p className="jb-page-sub">
                <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#6C3BFF", display:"inline-block" }} />
                  {JOBS.length} live roles · updated hourly
                </span>
              </p>
            </div>

            {/* Search */}
            <div className="jb-search-row">
              <div className="jb-searchbox">
                <input
                  placeholder="Role, skill or company…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="jb-search-btn">Search →</button>
              </div>
            </div>

            {/* Filters */}
            <div className="jb-filters">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`jb-chip${activeFilter === f.id ? " on" : ""}`}
                  onClick={() => setActiveFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Results meta */}
            <div className="jb-results-meta">
              <span className="jb-results-count">{filtered.length} role{filtered.length !== 1 ? "s" : ""}</span>
              <select className="jb-sort">
                <option>Most recent</option>
                <option>Highest salary</option>
                <option>Most relevant</option>
              </select>
            </div>

            {/* Job rows */}
            <div className="jb-job-list">
              {filtered.length === 0 && (
                <div className="jb-empty">
                  <div className="jb-empty-t">No roles found</div>
                  <p style={{ fontSize:13 }}>Try a different search term or filter</p>
                </div>
              )}
              {filtered.map((job) => {
                const b = badge(job.remote);
                const cc = categoryColor(job.category);
                const initials = job.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={job.id} className="jb-job-row" onClick={() => openJob(job)}>
                    <div className="jb-row-left">
                      <div className="jb-company-ico">{initials}</div>
                      <div className="jb-row-info">
                        <div className="jb-row-title">{job.title}</div>
                        <div className="jb-row-meta">
                          <span className="jb-row-company">{job.company}</span>
                          <span className="jb-row-sep" />
                          <span>{job.location}</span>
                          <span className="jb-row-sep" />
                          <div className="jb-row-tags">
                            {job.tags.slice(0, 3).map((t) => (
                              <span key={t} className="jb-row-tag">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="jb-row-right">
                      <div className="jb-row-sal">{fmt(job.salaryMin, job.salaryMax, job.currency)}</div>
                      <div className="jb-row-badges">
                        <span className="jb-pill" style={{ background: cc.bg, color: cc.color }}>{job.category}</span>
                        <span className="jb-pill" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                        <span className="jb-row-ago">{job.posted}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════ DETAIL VIEW ════════════════ */}
        {view === "detail" && activeJob && (() => {
          const b = badge(activeJob.remote);
          const cc = categoryColor(activeJob.category);
          const initials = activeJob.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          const related = JOBS.filter((j) => j.id !== activeJob.id && (j.category === activeJob.category || j.remote === activeJob.remote)).slice(0, 3);
          return (
            <div className="jb-detail-shell">
              <button className="jb-back-btn" onClick={goBack}>← Back to all roles</button>

              <div className="jb-detail-layout">
                {/* ── MAIN ── */}
                <div className="jb-detail-main">
                  {/* Header */}
                  <div className="jb-detail-header">
                    <div className="jb-detail-breadcrumb">
                      <span>Jobs</span>
                      <span>›</span>
                      <span style={{ color: cc.color }}>{activeJob.category}</span>
                      <span>›</span>
                      <span style={{ color: "var(--ink)" }}>{activeJob.title}</span>
                    </div>
                    <h1 className="jb-detail-h1">{activeJob.title}</h1>
                    <div className="jb-detail-meta-row">
                      <div className="jb-company-ico" style={{ width:36, height:36, borderRadius:8, fontSize:11 }}>{initials}</div>
                      <strong>{activeJob.company}</strong>
                      <span style={{ width:3, height:3, borderRadius:"50%", background:"var(--rule)", display:"inline-block" }} />
                      <span>{activeJob.location}</span>
                      <span style={{ width:3, height:3, borderRadius:"50%", background:"var(--rule)", display:"inline-block" }} />
                      <span style={{ fontSize:12, color:"var(--rule)", fontWeight:600 }}>{activeJob.posted}</span>
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <span className="jb-pill" style={{ background: cc.bg, color: cc.color, padding:"4px 10px", borderRadius:7, fontSize:11 }}>{activeJob.category}</span>
                      <span className="jb-pill" style={{ background: b.bg, color: b.color, padding:"4px 10px", borderRadius:7, fontSize:11 }}>{b.label}</span>
                      <span className="jb-pill" style={{ background:"var(--bg)", color:"var(--mid)", padding:"4px 10px", borderRadius:7, fontSize:11, border:"1px solid var(--rule)" }}>{activeJob.type}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div style={{ padding:"18px 32px", borderBottom:"1px solid var(--rule)", display:"flex", gap:6, flexWrap:"wrap" }}>
                    {activeJob.tags.map((t) => (
                      <span key={t} className="jb-detail-tag">{t}</span>
                    ))}
                  </div>

                  {/* Description */}
                  <div
                    className="jb-detail-body"
                    dangerouslySetInnerHTML={{ __html: activeJob.description }}
                  />
                </div>

                {/* ── SIDEBAR ── */}
                <aside className="jb-sidebar">
                  {/* Apply card */}
                  <div className="jb-sb-card">
                    <div className="jb-sal-display">
                      <div className="jb-sal-big">{fmt(activeJob.salaryMin, activeJob.salaryMax, activeJob.currency)}</div>
                      <div className="jb-sal-note">per year · {activeJob.currency}</div>
                    </div>
                    <button className="jb-apply-btn">Apply now →</button>
                    <button className="jb-save-btn">Save role</button>
                  </div>

                  {/* Details card */}
                  <div className="jb-sb-card">
                    <div className="jb-sb-section-title">Details</div>
                    {[
                      ["Company", activeJob.company],
                      ["Location", activeJob.location],
                      ["Work style", b.label],
                      ["Type", activeJob.type],
                      ["Category", activeJob.category],
                      ["Posted", activeJob.posted],
                    ].map(([k, v]) => (
                      <div className="jb-sb-row" key={k}>
                        <span className="jb-sb-key">{k}</span>
                        <span className="jb-sb-val">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Post CTA */}
                  <div className="jb-sb-dark">
                    <div className="jb-sb-dark-label">Hiring?</div>
                    <div className="jb-sb-dark-body">
                      Reach <em>40,000+</em> Web3 engineers looking for their next role.
                    </div>
                    <button className="jb-sb-dark-btn">Post a role →</button>
                  </div>

                  {/* Related */}
                  {related.length > 0 && (
                    <div className="jb-related">
                      <div className="jb-related-title">Similar roles</div>
                      <div className="jb-related-list">
                        {related.map((j) => {
                          const rb = badge(j.remote);
                          return (
                            <div key={j.id} className="jb-related-row" onClick={() => openJob(j)}>
                              <div>
                                <div className="jb-related-title-t">{j.title}</div>
                                <div className="jb-related-meta">{j.company} · {j.location}</div>
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:12, fontWeight:800, marginBottom:4 }}>{fmt(j.salaryMin, j.salaryMax, j.currency)}</div>
                                <span className="jb-pill" style={{ background:rb.bg, color:rb.color, fontSize:10, padding:"2px 7px", borderRadius:5 }}>{rb.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          );
        })()}

        {/* ── FOOTER ── */}
        <footer className="jb-footer">
          <div className="jb-footer-logo">
            <span style={{ width:8, height:8, borderRadius:"50%", background:"#6C3BFF", display:"inline-block" }} />
            JOBUKI
          </div>
          <div className="jb-footer-links">
            {["Browse","Companies","Salaries","Employers","About","Privacy"].map((l) => (
              <a key={l}>{l}</a>
            ))}
          </div>
          <div className="jb-footer-copy">© 2026 Saoir Ltd</div>
        </footer>
      </div>
    </>
  );
}
