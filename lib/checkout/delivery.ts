// Datos de entrega del checkout: normalización, búsqueda y validación.
//
// UNA sola fuente para el formulario (que avisa campo por campo mientras el
// comprador escribe) y para el servidor (`create-order` y la ruta de Confío,
// que no se fían de lo que llega del navegador). Si validaran distinto, el
// formulario dejaría pasar algo que el servidor rechaza con un error genérico.
//
// Los nombres de campo son los MISMOS que usa Nitro en `delivery_data`
// (`nombre, telefono, direccion, barrio, ciudad, departamento`) para que el día
// que el pedido web viaje a Nitro no haya que traducir nada.

import { COLOMBIA_DEPARTMENTS, type ColombiaDepartment } from '../colombia/divipola.ts'

export interface DeliveryInput {
  nombre: string
  telefono: string
  departamentoCode: string
  ciudadCode: string
  direccion: string
  barrio: string
  /** Apto, torre, casa, punto de referencia. Opcional. */
  indicaciones?: string
}

export interface DeliveryData {
  nombre: string
  telefono: string
  departamento: string
  departamentoCode: string
  ciudad: string
  ciudadCode: string
  direccion: string
  barrio: string
  indicaciones: string | null
}

export type DeliveryField = keyof DeliveryInput

export type DeliveryResult =
  | { ok: true; data: DeliveryData }
  | { ok: false; errors: Partial<Record<DeliveryField, string>> }

/** Minúsculas, sin tildes ni signos: «Bogotá, D.C.» → «bogota dc». */
export function foldText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const collapse = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')

export function findDepartment(code: string): ColombiaDepartment | undefined {
  return COLOMBIA_DEPARTMENTS.find((d) => d.code === code)
}

export function findCity(departmentCode: string, cityCode: string): string | undefined {
  // El código de municipio empieza por el del departamento (05001 → 05): si no
  // coincide, la ciudad no es de ese departamento.
  if (!cityCode.startsWith(departmentCode)) return undefined
  return findDepartment(departmentCode)?.cities.find(([code]) => code === cityCode)?.[1]
}

// Ciudades grandes que NO son capital, por código DANE (resueltos por nombre
// contra DIVIPOLA, no escritos de memoria). Las capitales no hacen falta: su
// código termina en 001.
const MAJOR_CITY_CODES = new Set([
  '05088', '05266', '05360', '05615', '05045', '05837', '05631', '05129', '05212', '05380',
  '08758', '08433', '25754', '25175', '25899', '25269', '25290', '25307', '25473', '25430',
  '25286', '76520', '76109', '76834', '76147', '76364', '76111', '76892', '68081', '68276',
  '68307', '68547', '66170', '15759', '15238', '52356', '52835', '44430', '44847', '47189',
  '13430', '54498', '54874', '54405', '20011', '23417', '23660', '73268', '41551', '41298',
  '50006', '50313', '70215',
])

/** Capitales y ciudades grandes van primero: con «cucu», Cúcuta antes que Cucunubá. */
function isMajorCity(code: string): boolean {
  return code.endsWith('001') || MAJOR_CITY_CODES.has(code)
}

export interface CityMatch {
  code: string
  name: string
  departmentCode: string
  departmentName: string
}

/**
 * Ciudades que coinciden con lo escrito, sin importar tildes. Primero las que
 * EMPIEZAN por el texto (o alguna de sus palabras) y luego las que lo
 * contienen; en cada grupo, capitales y ciudades grandes antes que el resto.
 * Si hay departamento elegido, busca solo en él.
 */
export function searchCities(query: string, departmentCode?: string, limit = 8): CityMatch[] {
  const q = foldText(query)
  const departments = departmentCode
    ? COLOMBIA_DEPARTMENTS.filter((d) => d.code === departmentCode)
    : COLOMBIA_DEPARTMENTS
  const starts: CityMatch[] = []
  const contains: CityMatch[] = []
  for (const d of departments) {
    for (const [code, name] of d.cities) {
      const folded = foldText(name)
      const match = { code, name, departmentCode: d.code, departmentName: d.name }
      if (!q) starts.push(match)
      else if (folded.startsWith(q) || folded.split(' ').some((w) => w.startsWith(q))) starts.push(match)
      else if (folded.includes(q)) contains.push(match)
    }
  }
  // Orden estable: dentro de cada grupo, las grandes primero y el resto en el
  // orden alfabético que ya traen.
  const byTier = (list: CityMatch[]) => [
    ...list.filter((c) => isMajorCity(c.code)),
    ...list.filter((c) => !isMajorCity(c.code)),
  ]
  // Sin texto (el comprador solo abrió la lista de su departamento) se deja el
  // orden alfabético: buscar a ojo en una lista que no lo es cuesta más.
  return (q ? [...byTier(starts), ...byTier(contains)] : starts).slice(0, limit)
}

export function searchDepartments(query: string): ColombiaDepartment[] {
  const q = foldText(query)
  if (!q) return COLOMBIA_DEPARTMENTS
  return COLOMBIA_DEPARTMENTS.filter((d) => {
    const folded = foldText(d.name)
    return folded.startsWith(q) || folded.split(' ').some((w) => w.startsWith(q)) || folded.includes(q)
  })
}

/** Deja solo dígitos y quita el 57 o +57 del principio. */
export function normalizePhone(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits
}

export function validateDelivery(input: Partial<Record<DeliveryField, unknown>>): DeliveryResult {
  const errors: Partial<Record<DeliveryField, string>> = {}

  const nombre = collapse(input.nombre)
  // Nombre y apellido: la transportadora entrega a una persona, y con un solo
  // nombre el mensajero no tiene a quién preguntar en portería.
  if (nombre.split(' ').filter((w) => w.length >= 2).length < 2) {
    errors.nombre = 'Escribe tu nombre y apellido.'
  } else if (nombre.length > 80) {
    errors.nombre = 'El nombre es demasiado largo.'
  }

  const telefono = normalizePhone(String(input.telefono ?? ''))
  // Celular colombiano: 10 dígitos y empieza por 3. Por ahí llega la guía y
  // por ahí llama el mensajero; un fijo no recibe WhatsApp.
  if (!/^3\d{9}$/.test(telefono)) {
    errors.telefono = 'Escribe un celular de 10 dígitos que empiece por 3.'
  }

  const departamentoCode = collapse(input.departamentoCode)
  const department = findDepartment(departamentoCode)
  if (!department) errors.departamentoCode = 'Elige tu departamento.'

  const ciudadCode = collapse(input.ciudadCode)
  const ciudad = department ? findCity(department.code, ciudadCode) : undefined
  // Se puede empezar por la ciudad: elegirla llena el departamento solo.
  if (!ciudad) errors.ciudadCode = 'Elige tu ciudad o municipio de la lista.'

  const direccion = collapse(input.direccion)
  if (direccion.length < 6) errors.direccion = 'Escribe la dirección completa. Ej: Calle 45 # 12-30.'
  else if (direccion.length > 150) errors.direccion = 'La dirección es demasiado larga.'

  const barrio = collapse(input.barrio)
  if (barrio.length < 3) errors.barrio = 'Escribe tu barrio (o vereda).'
  else if (barrio.length > 80) errors.barrio = 'El barrio es demasiado largo.'

  const indicaciones = collapse(input.indicaciones).slice(0, 200)

  if (Object.keys(errors).length > 0 || !department || !ciudad) return { ok: false, errors }

  return {
    ok: true,
    data: {
      nombre,
      telefono,
      departamento: department.name,
      departamentoCode: department.code,
      ciudad,
      ciudadCode,
      direccion,
      barrio,
      indicaciones: indicaciones || null,
    },
  }
}

/**
 * Columnas de `orders` para los datos de entrega. `customer_address` y
 * `customer_city` conservan su significado de siempre (la calle y la ciudad)
 * porque los leen el panel, Meta y la conciliación de Confío.
 */
export function deliveryToOrderColumns(d: DeliveryData) {
  return {
    customer_name: d.nombre,
    customer_phone: d.telefono,
    customer_address: d.direccion,
    customer_city: d.ciudad,
    customer_city_code: d.ciudadCode,
    customer_department: d.departamento,
    customer_neighborhood: d.barrio,
    customer_address_details: d.indicaciones,
  }
}
