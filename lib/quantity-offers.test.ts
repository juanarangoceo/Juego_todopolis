// El fallo que esto impide: que la ficha muestre un total y la pasarela cobre
// otro. En Confío eso deja el pedido en `mismatch` y lo tiene que mirar una
// persona; en contraentrega, el mensajero cobra un número distinto al que el
// comprador aceptó.

import assert from 'node:assert/strict'
import test from 'node:test'
import { priceForQuantity, savingsForQuantity, validOffers } from './quantity-offers.ts'

const UNIT = 129_000
const OFFERS = [{ quantity: 2, totalPrice: 229_000, label: 'El más elegido' }]

test('sin combos, el precio es unitario × cantidad', () => {
  assert.equal(priceForQuantity(UNIT, 1, undefined), 129_000)
  assert.equal(priceForQuantity(UNIT, 3, []), 387_000)
})

test('la cantidad exacta del combo cobra el precio del combo', () => {
  assert.equal(priceForQuantity(UNIT, 2, OFFERS), 229_000)
  assert.equal(savingsForQuantity(UNIT, 2, OFFERS), 29_000)
})

test('más unidades que el combo usan su precio por unidad', () => {
  // 229.000 / 2 = 114.500 por unidad → 3 unidades = 343.500
  assert.equal(priceForQuantity(UNIT, 3, OFFERS), 343_500)
})

test('una unidad nunca toma precio de combo', () => {
  assert.equal(priceForQuantity(UNIT, 1, OFFERS), UNIT)
})

test('un combo que no ahorra se ignora', () => {
  const malos = [
    { quantity: 2, totalPrice: 258_000 }, // igual a 2 sueltas
    { quantity: 3, totalPrice: 400_000 }, // más caro
  ]
  assert.deepEqual(validOffers(UNIT, malos), [])
  assert.equal(priceForQuantity(UNIT, 2, malos), 258_000)
})

test('datos rotos no rompen el cálculo', () => {
  const rotos = [null, { quantity: 1, totalPrice: 100 }, { quantity: 2.5, totalPrice: 1 }, { quantity: 2 }, 'x']
  assert.deepEqual(validOffers(UNIT, rotos), [])
  assert.equal(priceForQuantity(UNIT, 2, rotos), 258_000)
})

test('se ordenan por cantidad y no se repiten', () => {
  const list = validOffers(UNIT, [
    { quantity: 3, totalPrice: 330_000 },
    { quantity: 2, totalPrice: 229_000 },
    { quantity: 2, totalPrice: 200_000 },
  ])
  assert.deepEqual(list.map((o) => o.quantity), [2, 3])
  assert.equal(list[0].totalPrice, 229_000)
})
