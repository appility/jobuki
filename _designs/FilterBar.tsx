'use client'
import { useState } from 'react'

const FILTERS = [
  'All roles', 'Engineering', 'Product', 'Design',
  'Data & ML', 'DevOps', 'Security', 'Remote only', '£100k+',
]

export default function FilterBar() {
  const [active, setActive] = useState('All roles')
  return (
    <div className="flex gap-2 flex-wrap px-gutter py-[18px] max-w-[1280px] mx-auto">
      {FILTERS.map(f => (
        <button
          key={f}
          onClick={() => setActive(f)}
          className={active === f ? 'chip-active' : 'chip'}
        >
          {f}
        </button>
      ))}
    </div>
  )
}
