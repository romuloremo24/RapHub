import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'EscalaChile — Toda la escalada de Chile en un solo lugar',
    template: '%s | EscalaChile',
  },
  description:
    'Plataforma unificada de escalada en Chile. Zonas, vías, topos interactivos, gimnasios y comunidad.',
  keywords: [
    'escalada',
    'Chile',
    'climbing',
    'boulder',
    'deportiva',
    'trad',
    'zonas de escalada',
    'gimnasios escalada',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-roca text-nieve antialiased">
        {children}
      </body>
    </html>
  )
}
