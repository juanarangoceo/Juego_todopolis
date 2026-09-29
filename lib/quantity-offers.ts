// Combos por cantidad («Lleva 2 por $229.000»), en UN solo sitio.
//
// Lo usan la ficha (selector del hero), el checkout (total que ve el
// comprador) y `app/api/checkout/confio` (el número que va a la pasarela). Si
// cada uno calculara el precio por su cuenta, el comprador podría ver un total
// y pagar otro — y en Confío un monto distinto deja el pedido en `mismatch`.
//
// Puro y sin dependencias: se prueba con `node --test`.

export interface QuantityOffer {
  quantity: number
  totalPrice: number
  label?: string
}

/**
 * Deja solo los combos que tienen sentido: cantidad entera ≥ 2, precio
 * positivo y MÁS BARATO que comprar las unidades sueltas. Un combo que cuesta
 * igual o más no es una oferta, es un dato mal cargado, y mostrarlo como
 * ahorro sería engañoso. Ordenados por cantidad, sin cantidades repetidas.
 */
export function validOffers(unitPrice: number, offers: unknown): QuantityOffer[] {
  if (!Array.isArray(offers) || !(unitPrice > 0)) return []
  const byQty = new Map<number, QuantityOffer>()
  for (const raw of offers) {
    const o = raw as Partial<QuantityOffer> | null
    const quantity = Number(o?.quantity)
    const totalPrice = Math.round(Number(o?.totalPrice))
    if (!Number.isInteger(quantity) || quantity < 2 || quantity > 10) continue
    if (!(totalPrice > 0) || totalPrice >= quantity * unitPrice) continue
    if (byQty.has(quantity)) continue
    byQty.set(quantity, { quantity, totalPrice, label: o?.label?.trim() || undefined })
  }
  return [...byQty.values()].sort((a, b) => a.quantity - b.quantity)
}

/**
 * Precio de `quantity` unidades (sin envío).
 *
 * - Cantidad exacta de un combo → el precio del combo.
 * - Más unidades que el combo más cercano por debajo → el precio unitario de
 *   ese combo para todas. Así pedir 3 con un combo de 2 no sale más caro por
 *   unidad que pedir 2.
 * - Sin combo aplicable → precio unitario × cantidad.
 */
export function priceForQuantity(unitPrice: number, quantity: number, offers: unknown): number {
  const q = Math.max(1, Math.floor(quantity))
  const list = validOffers(unitPrice, offers)
  const exact = list.find((o) => o.quantity === q)
  if (exact) return exact.totalPrice
  const below = list.filter((o) => o.quantity < q).pop()
  if (below) return Math.round((below.totalPrice / below.quantity) * q)
  return Math.round(unitPrice * q)
}

/** Lo que se ahorra frente a comprar las unidades sueltas. 0 si no hay ahorro. */
export function savingsForQuantity(unitPrice: number, quantity: number, offers: unknown): number {
  return Math.max(0, Math.round(unitPrice * quantity) - priceForQuantity(unitPrice, quantity, offers))
}
