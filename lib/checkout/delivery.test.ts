// Lo que esto protege: que un pedido llegue con una dirección que el mensajero
// pueda encontrar. El formulario y el servidor validan con estas funciones; si
// se rompen en silencio, los pedidos entran incompletos y el fallo se ve días
// después, cuando la transportadora devuelve el paquete.

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findCity,
  foldText,
  normalizePhone,
  searchCities,
  searchDepartments,
  validateDelivery,
} from './delivery.ts'
import { COLOMBIA_DEPARTMENTS } from '../colombia/divipola.ts'

const valid = {
  nombre: 'Ana María Gómez',
  telefono: '300 123 4567',
  departamentoCode: '05',
  ciudadCode: '05001',
  direccion: 'Calle 45 # 12-30',
  barrio: 'Laureles',
  indicaciones: 'Apto 402, torre 2',
}

test('DIVIPOLA completo: 33 departamentos y 1.122 municipios', () => {
  assert.equal(COLOMBIA_DEPARTMENTS.length, 33)
  assert.equal(COLOMBIA_DEPARTMENTS.reduce((n, d) => n + d.cities.length, 0), 1122)
  // Cada municipio pertenece al departamento cuyo código lleva delante.
  for (const d of COLOMBIA_DEPARTMENTS) {
    for (const [code] of d.cities) assert.ok(code.startsWith(d.code), `${code} fuera de ${d.name}`)
  }
})

test('foldText ignora tildes, mayúsculas y signos', () => {
  assert.equal(foldText('Bogotá, D.C.'), 'bogota d c')
  assert.equal(foldText('  CÚCUTA '), 'cucuta')
})

test('searchCities encuentra sin tildes y prioriza lo que empieza por el texto', () => {
  const r = searchCities('medellin')
  assert.equal(r[0].name, 'Medellín')
  assert.equal(r[0].departmentName, 'Antioquia')
  // «Cúcuta» en DIVIPOLA es «San José de Cúcuta»: tiene que aparecer igual.
  assert.ok(searchCities('cucuta').some((c) => c.code === '54001'))
  // Las ciudades grandes primero: «cucu» es Cúcuta, no Cucunubá.
  assert.equal(searchCities('cucu')[0].name, 'Cúcuta')
  assert.equal(searchCities('bog')[0].code, '11001')
  // Filtrado por departamento.
  assert.ok(searchCities('san', '05').every((c) => c.departmentCode === '05'))
})

test('searchDepartments encuentra por cualquier palabra', () => {
  assert.equal(searchDepartments('valle')[0].name, 'Valle del Cauca')
  assert.equal(searchDepartments('santander').length, 2)
})

test('normalizePhone quita espacios y el 57', () => {
  assert.equal(normalizePhone('+57 300 123 4567'), '3001234567')
  assert.equal(normalizePhone('300-123-4567'), '3001234567')
})

test('validateDelivery acepta una dirección completa y la normaliza', () => {
  const r = validateDelivery(valid)
  assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.data.telefono, '3001234567')
  assert.equal(r.data.departamento, 'Antioquia')
  assert.equal(r.data.ciudad, 'Medellín')
  assert.equal(r.data.indicaciones, 'Apto 402, torre 2')
})

test('validateDelivery exige cada campo obligatorio', () => {
  const r = validateDelivery({})
  assert.equal(r.ok, false)
  if (r.ok) return
  for (const f of ['nombre', 'telefono', 'departamentoCode', 'ciudadCode', 'direccion', 'barrio'] as const) {
    assert.ok(r.errors[f], `falta error en ${f}`)
  }
  assert.equal(r.errors.indicaciones, undefined)
})

test('validateDelivery rechaza una ciudad de otro departamento', () => {
  // Medellín (05001) con Cundinamarca (25): el comprador cambió el
  // departamento después de elegir la ciudad, o alguien armó la petición a mano.
  const r = validateDelivery({ ...valid, departamentoCode: '25' })
  assert.equal(r.ok, false)
  if (!r.ok) assert.ok(r.errors.ciudadCode)
  assert.equal(findCity('25', '05001'), undefined)
})

test('validateDelivery pide nombre y apellido, y celular que empiece por 3', () => {
  const r = validateDelivery({ ...valid, nombre: 'Ana', telefono: '6041234567' })
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.ok(r.errors.nombre)
  assert.ok(r.errors.telefono)
})
