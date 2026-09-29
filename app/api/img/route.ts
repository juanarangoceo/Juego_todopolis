import { type NextRequest } from 'next/server'

// Proxy de imágenes de producto.
//
// WebGL solo acepta como textura imágenes del mismo origen o con CORS, y el CDN
// de Mastershop no manda CORS. Pasar las fotos por aquí las vuelve del mismo
// origen. Solo se aceptan los CDN del catálogo: un proxy abierto serviría para
// descargar cualquier cosa a nombre de este dominio.

const ALLOWED_HOSTS = new Set(['cdn.sanity.io', 'cdn.bemaster.com'])
const MAX_BYTES = 8 * 1024 * 1024

function mockSvg(spec: string): Response {
  const [, hue = '300', ...rest] = spec.split(':')
  const label = rest.join(':').replace(/[<>&"]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},80%,62%)"/><stop offset="1" stop-color="hsl(${(Number(hue) + 60) % 360},70%,38%)"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#g)"/><circle cx="256" cy="210" r="110" fill="rgba(255,255,255,.28)"/>
<text x="256" y="420" font-family="sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">${label}</text></svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } })
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('u') ?? ''
  if (raw.startsWith('mock:') && process.env.MOCK_CATALOG === '1') return mockSvg(raw)

  let src: URL
  try {
    src = new URL(raw)
  } catch {
    return new Response('URL inválida', { status: 400 })
  }
  if (src.protocol !== 'https:' || !ALLOWED_HOSTS.has(src.hostname)) {
    return new Response('Origen no permitido', { status: 403 })
  }

  // Sanity redimensiona en su CDN: una vitrina no necesita la foto de 2000 px.
  if (src.hostname === 'cdn.sanity.io') {
    const w = Math.min(1024, Math.max(64, Number(req.nextUrl.searchParams.get('w')) || 512))
    src.searchParams.set('w', String(w))
    src.searchParams.set('fit', 'max')
    src.searchParams.set('fm', 'jpg')
    src.searchParams.set('q', '80')
  }

  const upstream = await fetch(src, { next: { revalidate: 86400 } }).catch(() => null)
  if (!upstream || !upstream.ok) return new Response('Imagen no disponible', { status: 502 })
  const type = upstream.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) return new Response('No es una imagen', { status: 415 })
  const body = await upstream.arrayBuffer()
  if (body.byteLength > MAX_BYTES) return new Response('Imagen demasiado grande', { status: 413 })

  return new Response(body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
    },
  })
}
