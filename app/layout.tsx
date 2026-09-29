import type { Metadata, Viewport } from 'next'
// Fuentes empaquetadas (no Google Fonts en tiempo de build): mismas familias
// que todopolis.online — Montserrat para titulares y precios, Nunito para el resto.
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/montserrat/900.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Todópolis · La ciudad de todo',
  description: 'Recorre Todópolis en 3D: entra a las tiendas, mira los productos y pide sin salir de la ciudad. Pagas al recibir.',
  robots: { index: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#070514',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  )
}
