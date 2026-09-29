// Enlace de WhatsApp de la tienda.
//
// Puro y sin React a propósito: lo que decide el texto prellenado se prueba en
// una tabla de casos, no abriendo un chat en el teléfono.
//
// EL PREFILL LLEVA SIEMPRE LA URL DE LA PÁGINA, Y NO ES DECORACIÓN. Nitro Bot
// clasifica el origen de cada conversación con una regla que no necesita
// configuración por tienda: si el primer mensaje trae una URL http(s) que no
// es de una red social, esa conversación es del canal `web`
// (`lib/traffic/classify.ts`, regla `web_link`). Es el canal que mejor
// convierte con diferencia. Si alguien quita la URL del prefill, el tráfico de
// esta burbuja pasa a contarse como `desconocido` y el tablero de origen deja
// de servir — sin que nada falle ni avise.

const WA_BASE = 'https://wa.me/'

/**
 * wa.me solo acepta dígitos: ni '+', ni espacios, ni guiones. Devuelve `null`
 * en vez de un número a medias, para que el llamador pueda NO pintar el botón:
 * una burbuja que abre un chat con un número roto es peor que ninguna burbuja.
 */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  // E.164: entre 8 y 15 dígitos con indicativo. Un colombiano son 12 (57 + 10).
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

/**
 * El texto que el comprador ve escrito al abrir WhatsApp. Con `productName`
 * queda una frase que Lucy puede resolver en su primer turno sin preguntar
 * nada; sin él, el link basta para que sepa de dónde viene.
 */
export function buildWhatsAppPrefill(pageUrl: string, productName?: string | null): string {
  const name = productName?.trim()
  return name
    ? `Hola, quiero más información de ${name}\n${pageUrl}`
    : `Hola, vengo de la tienda y quiero más información.\n${pageUrl}`
}

/**
 * De dónde sale el número, en orden: lo que el cliente escribe en «Ajustes de
 * Tienda» del Studio manda; si ese campo está vacío, la variable de Vercel; si
 * tampoco hay, `null` y la burbuja no se pinta.
 *
 * El respaldo existe para que borrar el campo en Sanity no deje la tienda sin
 * burbuja de golpe, y para conservar el interruptor: quitar la variable Y
 * dejar el campo vacío es la forma de apagarla.
 */
export function resolveWhatsAppPhone(
  fromSanity: string | null | undefined,
  fromEnv: string | null | undefined
): string | null {
  return normalizeWhatsAppPhone(fromSanity) ?? normalizeWhatsAppPhone(fromEnv)
}

export function buildWhatsAppUrl(params: {
  phone: string | null | undefined
  pageUrl: string
  productName?: string | null
}): string | null {
  const phone = normalizeWhatsAppPhone(params.phone)
  if (!phone) return null
  const text = buildWhatsAppPrefill(params.pageUrl, params.productName)
  return `${WA_BASE}${phone}?text=${encodeURIComponent(text)}`
}

/**
 * Nombre del producto/colección a partir del `<title>` de la página. Se lee del
 * documento y no de una prop porque la burbuja vive en el layout, por encima de
 * la página en el árbol: el contexto de React no sube.
 *
 * El sufijo se quita REPETIDO, no una vez: el layout declara
 * `title.template = '%s | Todopolis'` y la ficha de producto ya devuelve
 * `<nombre> | Todopolis`, así que el título real llega duplicado
 * (`… | Todopolis | Todopolis`). Con un solo reemplazo, el nombre del producto
 * se le mandaría al comprador con un « | Todopolis» pegado detrás.
 */
export function productNameFromTitle(title: string | null | undefined): string | null {
  // Acepta 'Todopolis' y 'Todópolis': la marca lleva tilde desde sep-2026, pero
  // un título cacheado o un enlace viejo puede traer la forma sin tilde y el
  // nombre del producto no puede quedarse con el sufijo pegado.
  const clean = (title ?? '').replace(/(?:\s*\|\s*Tod[oó]polis\s*)+$/i, '').trim()
  if (!clean || /^tod[oó]polis$/i.test(clean)) return null
  if (/producto no encontrado/i.test(clean)) return null
  return clean
}

/** Rutas donde el `<title>` nombra algo concreto que vale la pena prellenar. */
export function pathHasNamedSubject(pathname: string): boolean {
  return pathname.startsWith('/producto/') || pathname.startsWith('/coleccion/')
}
