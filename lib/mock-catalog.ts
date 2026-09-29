// Catálogo de PRUEBA para desarrollar sin red (MOCK_CATALOG=1). Nunca se usa
// en producción: si Sanity falla allá, la ciudad muestra el local vacío en vez
// de inventar productos con precios que no existen.

import type { CatalogResponse, GameProduct, GameProductDetail } from './catalog-types'

const NAMES: Record<string, string[]> = {
  moda: ['Conjunto deportivo', 'Blusa satinada', 'Jean tiro alto', 'Vestido midi', 'Pijama de seda'],
  fajas: ['Faja reductora', 'Body moldeador', 'Short levanta cola', 'Cinturilla deportiva'],
  calzado: ['Tenis urbanos', 'Sandalias de plataforma', 'Botas texanas', 'Pantuflas de peluche'],
  accesorios: ['Reloj dorado', 'Gafas de sol', 'Bolso de cuero', 'Morral antirrobo', 'Aretes de plata'],
  'bienestar-intimo': ['Conjunto de encaje', 'Babydoll negro', 'Body de encaje', 'Set de tres piezas'],
  belleza: ['Sérum de vitamina C', 'Plancha de cabello', 'Kit de maquillaje', 'Perfume floral', 'Mascarilla capilar', 'Secador iónico'],
  hogar: ['Lámpara de luna', 'Organizador de zapatos', 'Aspiradora inalámbrica', 'Cobija de peluche', 'Taladro compacto'],
  cocina: ['Freidora de aire', 'Set de cuchillos', 'Licuadora portátil', 'Termo inteligente'],
  electronica: ['Audífonos inalámbricos', 'Smartwatch', 'Proyector portátil', 'Aro de luz', 'Parlante bluetooth'],
  'salud-bienestar': ['Masajeador de cuello', 'Cojín ortopédico', 'Humidificador', 'Pistola de masaje'],
  deportes: ['Bandas de resistencia', 'Rueda abdominal', 'Lazo de velocidad', 'Botella deportiva'],
  bebes: ['Monitor de bebé', 'Portabebés', 'Calentador de tetero'],
  juguetes: ['Alcancía electrónica', 'Carro a control remoto', 'Peluche gigante', 'Juego de mesa'],
  mascotas: ['Cama para perro', 'Rascador para gato', 'Bebedero automático'],
  'carro-moto': ['Inflador de llantas', 'Intercomunicador de casco', 'Aspiradora para carro'],
  otros: ['Gas pimienta', 'Organizador de escritorio'],
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function mockCatalog(): CatalogResponse {
  const products: GameProduct[] = []
  for (const [category, names] of Object.entries(NAMES)) {
    // Repetimos para que algunas tiendas tengan varias páginas de vitrinas.
    const reps = category === 'belleza' ? 5 : 2
    for (let r = 0; r < reps; r++) {
      names.forEach((name, i) => {
        const slug = `${category}-${i}-${r}`
        const h = hash(slug)
        const price = 29_900 + (h % 20) * 5_000
        products.push({
          id: slug,
          slug,
          name: r ? `${name} ${r + 1}` : name,
          price,
          originalPrice: h % 3 === 0 ? price + 20_000 : null,
          category,
          image: `mock:${h % 360}:${name}`,
          isBestSeller: h % 5 === 0,
          isNew: h % 4 === 0,
          isDestacado: h % 7 === 0,
          shortDescription: 'Producto de prueba del catálogo local.',
        })
      })
    }
  }
  return { products, whatsappPhone: '573127511852', source: 'mock' }
}

export function mockDetail(slug: string): GameProductDetail | null {
  const p = mockCatalog().products.find((x) => x.slug === slug)
  if (!p) return null
  return {
    ...p,
    images: p.image ? [p.image] : [],
    benefits: [
      { title: 'Beneficio uno', description: 'Texto de prueba.' },
      { title: 'Beneficio dos', description: 'Texto de prueba.' },
    ],
    variants: hash(slug) % 2 ? [] : [
      { idVariant: 1, name: 'S', available: true },
      { idVariant: 2, name: 'M', available: true },
      { idVariant: 3, name: 'L', available: false },
    ],
    quantityOffers: [{ quantity: 2, totalPrice: p.price * 2 - 10_000, label: 'Lleva 2' }],
  }
}
