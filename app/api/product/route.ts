import { NextResponse, type NextRequest } from 'next/server'
import { getProductDetail } from '@/lib/catalog'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  if (!slug) return NextResponse.json({ error: 'Falta el producto' }, { status: 400 })
  try {
    const product = await getProductDetail(slug)
    if (!product) return NextResponse.json({ error: 'Producto no disponible' }, { status: 404 })
    return NextResponse.json(product, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } })
  } catch (err) {
    console.error('[product] error:', err)
    return NextResponse.json({ error: 'Producto no disponible' }, { status: 503 })
  }
}
