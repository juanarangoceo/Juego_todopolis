import type { GameProduct } from '@/lib/catalog-types'

/** Vitrinas por página dentro de una tienda. */
export const PAGE_SIZE = 12

/** Orden y filtro de las vitrinas: primero lo más vendido; el asesor puede acotar. */
export function filteredProducts(list: GameProduct[], filter: string): GameProduct[] {
  const sorted = [...list.filter((p) => p.isBestSeller), ...list.filter((p) => !p.isBestSeller)]
  if (filter === 'best') return sorted.filter((p) => p.isBestSeller || p.isDestacado)
  if (filter === 'under50') return sorted.filter((p) => p.price <= 50_000)
  if (filter === 'under100') return sorted.filter((p) => p.price <= 100_000)
  return sorted
}
