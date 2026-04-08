import Link from 'next/link'
import { Mountain, Menu } from 'lucide-react'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gris bg-roca/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Mountain size={28} className="text-naranja" />
          <span className="font-heading text-xl font-bold text-nieve">
            Escala<span className="text-naranja">Chile</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link href="/zonas" className="text-sm font-medium text-nieve-dim transition-colors hover:text-nieve">
            Zonas
          </Link>
          <Link href="/gimnasios" className="text-sm font-medium text-nieve-dim transition-colors hover:text-nieve">
            Gimnasios
          </Link>
        </div>

        <button className="text-nieve-dim md:hidden" aria-label="Menú">
          <Menu size={24} />
        </button>
      </nav>
    </header>
  )
}
