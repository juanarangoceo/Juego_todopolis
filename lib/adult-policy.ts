// Qué producto para adultos puede entrar a la tienda (24-sep-2026).
//
// Todópolis vende LENCERÍA (categoría `bienestar-intimo`, que se muestra como
// «Lencería», con aviso de edad y sin Píxel) y NO vende juguetes para adultos.
// Se retiraron por dos motivos: el revisor de Meta entra al home y veía la
// pestaña con productos sexuales, lo que arriesga anuncios rechazados o la
// cuenta marcada; y chocan con «Eleva tu estilo».
//
// El sync de Mastershop importa solo lo nuevo de «mis productos». Sin esta
// regla, el próximo juguete que se agregara allá entraría a la tienda sin que
// nadie lo decidiera. En duda, NO entra: un juguete publicado cuesta más que
// una prenda que haya que subir a mano.

/** Valor almacenado de la categoría de adultos. Se muestra como «Lencería». */
export const ADULT_CATEGORY = 'bienestar-intimo'

const TOY = /masajeador|vibrador|consolador|dildo|succionador|estimulador|estimulante|lubricante|plug|anillo (vibrador|para el pene)|bala vibradora|huevo vibrador|retardante|potenciador|feromona|kit de bienestar|sex|er[oó]tico|masturbador|bomba de vac[ií]o/i
const LINGERIE = /lencer[ií]a|panty|pantie|tanga|hilo|brasier|brassier|bralette|sost[eé]n|conjunto|set|body|babydoll|baby doll|liguero|medias|corset|cors[eé]|bata|pijama|camis[oó]n|vestido|encaje|disfraz|bikini|culotte|cachetero|brief/i

/**
 * ¿Puede entrar a la tienda un producto que el proveedor marcó como adulto?
 * Solo si parece lencería y nada en el nombre dice juguete.
 */
export function isAllowedAdultProduct(name: string, description = ''): boolean {
  const text = `${name} ${description.slice(0, 400)}`
  if (TOY.test(name) || TOY.test(text)) return false
  return LINGERIE.test(name)
}
