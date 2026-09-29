import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deliveryToOrderColumns, validateDelivery } from '@/lib/checkout/delivery'
import { orderTotals, resolveOrderProduct } from '@/lib/order-pricing'

// Pedido hecho dentro de la ciudad.
//
// Es el mismo flujo que `app/actions/create-order.ts` de todopolis.online:
// mismas validaciones de entrega, precio resuelto desde Sanity y la misma tabla
// `orders`, así el pedido aparece en el panel, sale a Nitro y lo despacha el
// equipo sin saber que vino del juego. Lo único propio es la atribución:
// `utm_source = juego-todopolis` para medir cuánto vende la ciudad.

interface OrderBody {
  productId?: string
  variantId?: number | null
  quantity?: number
  storeId?: string
  nombre?: string
  telefono?: string
  departamentoCode?: string
  ciudadCode?: string
  direccion?: string
  barrio?: string
  indicaciones?: string
}

export async function POST(req: NextRequest) {
  let body: OrderBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  const delivery = validateDelivery(body as Record<string, unknown>)
  if (!delivery.ok) {
    return NextResponse.json({ success: false, error: 'Revisa los datos de entrega.', fields: delivery.errors })
  }

  const slug = String(body.productId ?? '').trim()
  const variantId = typeof body.variantId === 'number' && Number.isFinite(body.variantId) ? body.variantId : null
  const quantity = Math.max(1, Math.min(20, Math.floor(Number(body.quantity) || 1)))

  let product
  try {
    product = await resolveOrderProduct(slug, variantId)
  } catch (err) {
    console.error('[order] Sanity no respondió:', err)
    return NextResponse.json({ success: false, error: 'No pudimos confirmar el precio. Intenta de nuevo.' })
  }
  if (!product) return NextResponse.json({ success: false, error: 'Este producto no está disponible en este momento.' })
  if (product.hasVariants && !variantId) {
    return NextResponse.json({ success: false, error: 'Por favor selecciona una opción del producto.' })
  }
  const { total, pricePerUnit } = orderTotals(product, quantity)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[order] Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    return NextResponse.json({ success: false, error: 'Los pedidos desde la ciudad aún no están activos. Escríbenos por WhatsApp.' })
  }

  const storeId = String(body.storeId ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 40)
  const supabase = createClient(supabaseUrl, serviceKey)
  const { error } = await supabase.from('orders').insert([
    {
      product_id: slug,
      product_name: product.name,
      price: pricePerUnit,
      quantity,
      ...deliveryToOrderColumns(delivery.data),
      variant_id: variantId,
      variant_name: product.variantName,
      status: 'pending',
      utm_source: 'juego-todopolis',
      utm_medium: 'juego',
      utm_campaign: 'ciudad',
      utm_content: storeId || null,
      landing_path: storeId ? `/ciudad/${storeId}` : '/ciudad',
      referrer: req.headers.get('referer')?.slice(0, 200) ?? null,
    },
  ])

  if (error) {
    console.error('[order] error insertando orden:', error)
    return NextResponse.json({ success: false, error: 'Ocurrió un error al procesar tu pedido' })
  }
  return NextResponse.json({ success: true, total })
}
