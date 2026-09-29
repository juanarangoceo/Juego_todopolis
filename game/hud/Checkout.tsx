'use client'

import { useMemo, useState } from 'react'
import { formatCOP, shippingFor, type GameProductDetail } from '@/lib/catalog-types'
import { priceForQuantity } from '@/lib/quantity-offers'
import { findDepartment, searchCities, validateDelivery, type CityMatch, type DeliveryField } from '@/lib/checkout/delivery'
import { useGame } from '../lib/store'

// El formulario de todopolis.online dentro de la ciudad: mismos campos, mismas
// reglas (`lib/checkout/delivery.ts`, copiado tal cual de la tienda) y mismo
// destino (la tabla `orders`). El precio lo vuelve a calcular el servidor.

interface Props {
  product: GameProductDetail
  variantId: number | null
  quantity: number
  storeId: string
  onBack: () => void
  onClose: () => void
}

type Fields = Record<DeliveryField, string>

export function Checkout({ product, variantId, quantity, storeId, onBack, onClose }: Props) {
  const addCoins = useGame((s) => s.addCoins)
  const [f, setF] = useState<Fields>({ nombre: '', telefono: '', departamentoCode: '', ciudadCode: '', direccion: '', barrio: '', indicaciones: '' })
  const [cityQuery, setCityQuery] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<DeliveryField, string>>>({})
  const [sending, setSending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const suggestions = useMemo(() => (cityQuery.trim().length >= 2 ? searchCities(cityQuery, undefined, 6) : []), [cityQuery])
  const subtotal = priceForQuantity(product.price, quantity, product.quantityOffers)
  const shipping = shippingFor(product)
  const variant = product.variants.find((v) => v.idVariant === variantId)

  const set = (k: DeliveryField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: undefined })
  }

  const pickCity = (c: CityMatch) => {
    setF({ ...f, ciudadCode: c.code, departamentoCode: c.departmentCode })
    setCityQuery(`${c.name}, ${c.departmentName}`)
    setShowSuggest(false)
    setErrors({ ...errors, ciudadCode: undefined, departamentoCode: undefined })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const check = validateDelivery(f)
    if (!check.ok) {
      setErrors(check.errors)
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, productId: product.slug, variantId, quantity, storeId }),
      })
      const json = await res.json()
      if (json.success) {
        setDone(true)
        addCoins(100, 'Pedido recibido · +100 TodoCoins')
      } else {
        if (json.fields) setErrors(json.fields)
        setServerError(json.error ?? 'No pudimos procesar el pedido.')
      }
    } catch {
      setServerError('Sin conexión. Revisa tu internet e intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const err = (k: DeliveryField) => (errors[k] ? <div className="err">{errors[k]}</div> : null)

  if (done) {
    return (
      <div className="overlay">
        <div className="panel glass glass-strong narrow" style={{ textAlign: 'center' }}>
          <div className="eyebrow">Pedido recibido</div>
          <h2 className="title" style={{ fontSize: 28, margin: '8px 0' }}>
            ¡Listo, {f.nombre.split(' ')[0]}!
          </h2>
          <p className="desc" style={{ color: 'var(--text)' }}>
            Te escribimos por WhatsApp al {f.telefono} para confirmar. Pagas {formatCOP(subtotal + shipping)} al recibir. Llega en 3 a 7 días hábiles.
          </p>
          <p style={{ color: 'var(--gold)', fontWeight: 800 }}>+100 TodoCoins por tu compra</p>
          <button className="btn btn-cta" style={{ width: '100%' }} onClick={onClose}>
            Seguir recorriendo la ciudad
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="overlay">
      <div className="panel glass glass-strong narrow">
        <button className="btn icon-btn close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '4px 0', border: 0 }}>
          ← Volver al producto
        </button>
        <div className="eyebrow" style={{ marginTop: 6 }}>
          Datos de entrega
        </div>
        <h2 className="title" style={{ margin: '4px 0 12px', fontSize: 22 }}>
          ¿A dónde te lo enviamos?
        </h2>
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="nombre">Nombre y apellido</label>
            <input id="nombre" autoComplete="name" value={f.nombre} onChange={set('nombre')} />
            {err('nombre')}
          </div>
          <div className="field">
            <label htmlFor="telefono">Celular (WhatsApp)</label>
            <input id="telefono" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" value={f.telefono} onChange={set('telefono')} />
            {err('telefono')}
          </div>
          <div className="field" style={{ position: 'relative' }}>
            <label htmlFor="ciudad">Ciudad o municipio</label>
            <input
              id="ciudad"
              autoComplete="off"
              placeholder="Escribe tu ciudad"
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value)
                setShowSuggest(true)
                setF({ ...f, ciudadCode: '', departamentoCode: '' })
              }}
              onFocus={() => setShowSuggest(true)}
            />
            {showSuggest && suggestions.length > 0 && (
              <div className="suggest">
                {suggestions.map((c) => (
                  <button type="button" key={c.code} onClick={() => pickCity(c)}>
                    <b>{c.name}</b> <span style={{ color: 'var(--muted)' }}>· {c.departmentName}</span>
                  </button>
                ))}
              </div>
            )}
            {f.departamentoCode && <div className="hint">Departamento: {findDepartment(f.departamentoCode)?.name}</div>}
            {err('ciudadCode') ?? err('departamentoCode')}
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="direccion">Dirección</label>
              <input id="direccion" autoComplete="street-address" placeholder="Calle 45 # 12-30" value={f.direccion} onChange={set('direccion')} />
              {err('direccion')}
            </div>
            <div className="field">
              <label htmlFor="barrio">Barrio</label>
              <input id="barrio" value={f.barrio} onChange={set('barrio')} />
              {err('barrio')}
            </div>
          </div>
          <div className="field">
            <label htmlFor="indicaciones">Apto, torre o punto de referencia (opcional)</label>
            <input id="indicaciones" value={f.indicaciones} onChange={set('indicaciones')} />
          </div>

          <div className="summary">
            <div className="line">
              <span>
                {product.name}
                {variant ? ` · ${variant.name}` : ''} × {quantity}
              </span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            <div className="line">
              <span>Envío</span>
              <span>{shipping === 0 ? 'Gratis' : formatCOP(shipping)}</span>
            </div>
            <div className="line total">
              <span>Pagas al recibir</span>
              <span>{formatCOP(subtotal + shipping)}</span>
            </div>
          </div>
          {serverError && <div className="alert">{serverError}</div>}
          <button className="btn btn-cta" type="submit" disabled={sending}>
            {sending ? 'Enviando pedido…' : 'Confirmar pedido'}
          </button>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0, textAlign: 'center' }}>
            Llega en 3 a 7 días hábiles. Te confirmamos por WhatsApp.
          </p>
        </form>
      </div>
    </div>
  )
}
