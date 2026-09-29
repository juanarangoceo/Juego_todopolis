import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog'

// Dinámica: el catálogo no se congela en el build. La consulta a Sanity se
// cachea 10 min (`sanityFetch`) y la respuesta en el CDN de Vercel.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await getCatalog(), {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('[catalog] no se pudo leer Sanity:', err)
    return NextResponse.json({ error: 'Catálogo no disponible' }, { status: 503 })
  }
}
