'use client'
export default function SearchBar() {
  return (
    <div className="search-bar">
      <input className="search-input" type="text" placeholder="Role, skill or company…" />
      <div className="w-[2px] bg-border shrink-0" />
      <select className="search-select">
        <option>Anywhere</option>
        <option>London</option>
        <option>Manchester</option>
        <option>Remote only</option>
      </select>
      <div className="w-[2px] bg-border shrink-0" />
      <select className="search-select">
        <option>All levels</option>
        <option>Junior</option>
        <option>Mid</option>
        <option>Senior</option>
        <option>Lead+</option>
      </select>
      <button className="search-go">Search →</button>
    </div>
  )
}
