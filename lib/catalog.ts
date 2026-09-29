import 'server-only'
import { sanityFetch } from './sanity'
import { ADULT_CATEGORY, isAllowedAdultProduct } from './adult-policy'
import type { CatalogResponse, GameProduct, GameProductDetail } from './catalog-types'
import { mockCatalog, mockDetail } from './mock-catalog'

const LIST_QUERY = `{
  "products": *[_type == "product" && defined(slug.current) && defined(price) && !(_id in path("drafts.**"))] | order(isBestSeller desc, _createdAt desc) {
    "id": _id,
    "slug": slug.current,
    name,
    price,
    originalPrice,
    category,
    "image": coalesce(images[0].asset->url, mastershopImageUrl, aiLifestyleImage.asset->url),
    isBestSeller,
    isNew,
    "isDestacado": isVip,
    shortDescription
  },
  "whatsappPhone": *[_type == "storeSettings"][0].whatsappPhone
}`

const DETAIL_QUERY = `*[_type == "product" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
  "id": _id,
  "slug": slug.current,
  name,
  price,
  originalPrice,
  category,
  "image": coalesce(images[0].asset->url, mastershopImageUrl, aiLifestyleImage.asset->url),
  "images": images[].asset->url,
  mastershopImageUrl,
  "aiLifestyleImage": aiLifestyleImage.asset->url,
  isBestSeller,
  isNew,
  "isDestacado": isVip,
  shortDescription,
  benefits[] { title, description },
  variants[] { idVariant, name, stock, isEnable },
  quantityOffers[] { quantity, totalPrice, label }
}`

const useMock = () => process.env.MOCK_CATALOG === '1'

type RawProduct = Omit<GameProduct, 'isBestSeller' | 'isNew' | 'isDestacado'> & {
  isBestSeller?: boolean | null
  isNew?: boolean | null
  isDestacado?: boolean | null
}

function toGameProduct(p: RawProduct): GameProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: Math.round(p.price),
    originalPrice: p.originalPrice && p.originalPrice > p.price ? Math.round(p.originalPrice) : null,
    category: (p.category ?? 'otros').trim().toLowerCase(),
    image: p.image ?? null,
    isBestSeller: p.isBestSeller === true,
    isNew: p.isNew === true,
    isDestacado: p.isDestacado === true,
    shortDescription: p.shortDescription ?? null,
  }
}

/** La tienda no vende juguetes para adultos: en la ciudad tampoco entran. */
function allowed(p: GameProduct): boolean {
  if (!(p.price > 0)) return false
  if (p.category === ADULT_CATEGORY) return isAllowedAdultProduct(p.name, p.shortDescription ?? '')
  return true
}

export async function getCatalog(): Promise<CatalogResponse> {
  if (useMock()) return mockCatalog()
  const data = await sanityFetch<{ products: RawProduct[]; whatsappPhone: string | null }>(LIST_QUERY)
  return {
    products: data.products.map(toGameProduct).filter(allowed),
    whatsappPhone: data.whatsappPhone ?? null,
    source: 'sanity',
  }
}

export async function getProductDetail(slug: string): Promise<GameProductDetail | null> {
  if (useMock()) return mockDetail(slug)
  const raw = await sanityFetch<
    | (RawProduct & {
        images?: string[] | null
        mastershopImageUrl?: string | null
        aiLifestyleImage?: string | null
        benefits?: { title?: string; description?: string }[] | null
        variants?: { idVariant?: number; name?: string; stock?: number | null; isEnable?: boolean | null }[] | null
        quantityOffers?: { quantity: number; totalPrice: number; label?: string }[] | null
      })
    | null
  >(DETAIL_QUERY, { slug }, { revalidate: 300 })
  if (!raw) return null
  const base = toGameProduct(raw)
  if (!allowed(base)) return null
  const images = [...(raw.images ?? []), raw.mastershopImageUrl, raw.aiLifestyleImage].filter(
    (u): u is string => typeof u === 'string' && u.startsWith('http')
  )
  return {
    ...base,
    images: [...new Set(images)].slice(0, 6),
    benefits: (raw.benefits ?? [])
      .filter((b) => b?.title)
      .map((b) => ({ title: b.title!, description: b.description ?? '' }))
      .slice(0, 4),
    variants: (raw.variants ?? [])
      .filter((v) => typeof v?.idVariant === 'number' && v.isEnable !== false)
      .map((v) => ({
        idVariant: v.idVariant!,
        name: v.name ?? `Opción ${v.idVariant}`,
        available: !(typeof v.stock === 'number' && v.stock <= 0),
      })),
    quantityOffers: raw.quantityOffers ?? [],
  }
}
