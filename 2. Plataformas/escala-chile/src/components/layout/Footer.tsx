import { Mountain } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-gris bg-roca py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <Mountain size={20} className="text-naranja" />
            <span className="font-heading text-sm font-semibold text-nieve-dim">
              EscalaChile
            </span>
          </div>
          <p className="text-center text-xs text-nieve-dim">
            Toda la escalada de Chile, en un solo lugar. Datos recopilados de fuentes
            públicas con amor por la comunidad.
          </p>
          <p className="text-xs text-gris-light">&copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  )
}
