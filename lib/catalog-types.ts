// Lo que el juego necesita de cada producto. Se comparte entre el servidor
// (que lo arma desde Sanity) y el cliente (que lo pinta en las vitrinas).

export interface GameProduct {
  id: string
  slug: string
  name: string
  price: number
  originalPrice: number | null
  category: string
  /** URL original de la foto (Sanity o Mastershop). El cliente la pide por /api/img. */
  image: string | null
  isBestSeller: boolean
  isNew: boolean
  isDestacado: boolean
  shortDescription: string | null
}

export interface GameProductDetail extends GameProduct {
  images: string[]
  benefits: { title: string; description: string }[]
  variants: { idVariant: number; name: string; available: boolean }[]
  quantityOffers: { quantity: number; totalPrice: number; label?: string }[]
}

export interface CatalogResponse {
  products: GameProduct[]
  whatsappPhone: string | null
  source: 'sanity' | 'mock'
}

/** Envío: gratis en Destacados, $12.000 en el resto (mismo criterio que la tienda). */
export function shippingFor(p: { isDestacado: boolean }): number {
  return p.isDestacado ? 0 : 12_000
}

export function formatCOP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CO')
}

/** Ruta del proxy de imágenes: mismo origen, así WebGL puede usarla como textura. */
export function imageProxyUrl(src: string | null | undefined, width = 512): string | null {
  if (!src) return null
  return `/api/img?w=${width}&u=${encodeURIComponent(src)}`
}
