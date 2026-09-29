import 'server-only'
import { getProductDetail } from './catalog'
import { priceForQuantity } from './quantity-offers'
import { shippingFor } from './catalog-types'

// Igual que en todopolis.online (`lib/checkout/order-pricing.ts`): el precio
// de un pedido SIEMPRE sale de Sanity en el servidor, nunca del navegador. En
// contraentrega el mensajero cobra lo que diga el pedido.
export async function resolveOrderProduct(slug: string, variantId: number | null) {
  const product = await getProductDetail(slug)
  if (!product) return null

  const variant = variantId ? product.variants.find((v) => v.idVariant === variantId) ?? null : null
  if (variantId && (!variant || !variant.available)) return null

  return {
    name: product.name,
    unitPrice: product.price,
    quantityOffers: product.quantityOffers,
    isDestacado: product.isDestacado,
    hasVariants: product.variants.length > 0,
    variantName: variant?.name ?? null,
  }
}

export type OrderProduct = NonNullable<Awaited<ReturnType<typeof resolveOrderProduct>>>

/** Se guarda el total dividido por unidad: el panel y Meta calculan `price × quantity`. */
export function orderTotals(product: OrderProduct, quantity: number) {
  const subtotal = priceForQuantity(product.unitPrice, quantity, product.quantityOffers)
  const shipping = shippingFor(product)
  const total = subtotal + shipping
  return { subtotal, shipping, total, pricePerUnit: total / quantity }
}
