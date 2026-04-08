'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function HeroSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/zonas?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/zonas')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-lg overflow-hidden rounded-lg border border-gris bg-roca-light shadow-lg">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar zona, ciudad o tipo de roca..."
        className="flex-1 bg-transparent px-4 py-3 text-nieve placeholder:text-gris-light focus:outline-none"
      />
      <button
        type="submit"
        className="flex items-center gap-2 bg-naranja px-5 py-3 font-medium text-white transition-colors hover:bg-naranja-light"
      >
        <Search size={18} />
        Buscar
      </button>
    </form>
  )
}
