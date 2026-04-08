import type { Metadata } from 'next';
import { Search, Map, Heart } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vesta — Compara propiedades en Chile',
  description: 'Encuentra y compara arriendos y ventas de departamentos, casas y más en Chile. Datos de Portal Inmobiliario, TocToc, MercadoLibre y Yapo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-surface-alt">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border-light">
          <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
            <a href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-primary">Vesta</span>
            </a>
            <nav className="flex items-center gap-1">
              <a href="/" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-primary">
                <Search size={16} />
                Buscar
              </a>
              <a href="/mapa" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-primary">
                <Map size={16} />
                Mapa
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
