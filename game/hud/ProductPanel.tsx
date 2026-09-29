'use client'

import { useEffect, useState } from 'react'
import { formatCOP, imageProxyUrl, shippingFor, type GameProductDetail } from '@/lib/catalog-types'
import { priceForQuantity, savingsForQuantity, validOffers } from '@/lib/quantity-offers'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { currentStore, useGame } from '../lib/store'
import { Checkout } from './Checkout'

const SITE = 'https://todopolis.online'

export function ProductPanel() {
  const product = useGame((s) => s.product)
  const openProduct = useGame((s) => s.openProduct)
  const checkoutOpen = useGame((s) => s.checkoutOpen)
  const setCheckout = useGame((s) => s.setCheckout)
  const whatsappPhone = useGame((s) => s.catalog?.whatsappPhone ?? null)
  const [detail, setDetail] = useState<GameProductDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [variantId, setVariantId] = useState<number | null>(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    if (!product) return
    let alive = true
    setDetail(null)
    setFailed(false)
    setImgIdx(0)
    setVariantId(null)
    setQty(1)
    fetch(`/api/product?slug=${encodeURIComponent(product.slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: GameProductDetail) => alive && setDetail(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [product])

  if (!product) return null
  const p = detail ?? { ...product, images: product.image ? [product.image] : [], benefits: [], variants: [], quantityOffers: [] }
  const images = p.images.length ? p.images : product.image ? [product.image] : []
  const offers = validOffers(p.price, p.quantityOffers)
  const subtotal = priceForQuantity(p.price, qty, p.quantityOffers)
  const savings = savingsForQuantity(p.price, qty, p.quantityOffers)
  const shipping = shippingFor(p)
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0
  const needsVariant = p.variants.length > 0 && variantId === null
  const pageUrl = `${SITE}/producto/${p.slug}`
  const wa = buildWhatsAppUrl({ phone: whatsappPhone, pageUrl, productName: p.name })

  if (checkoutOpen && detail) {
    return (
      <Checkout
        product={detail}
        variantId={variantId}
        quantity={qty}
        storeId={currentStore()?.id ?? ''}
        onBack={() => setCheckout(false)}
        onClose={() => openProduct(null)}
      />
    )
  }

  return (
    <div className="overlay" onClick={() => openProduct(null)}>
      <div className="panel glass glass-strong" onClick={(e) => e.stopPropagation()}>
        <button className="btn icon-btn close" onClick={() => openProduct(null)} aria-label="Cerrar">
          ✕
        </button>
        <div className="product-grid">
          <div>
            {images[imgIdx] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="product-img" src={imageProxyUrl(images[imgIdx], 900)!} alt={p.name} />
            ) : (
              <div className="product-img" />
            )}
            {images.length > 1 && (
              <div className="thumbs">
                {images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={imageProxyUrl(src, 160)!} alt="" className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)} />
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {p.isBestSeller && <span className="badge badge-gold">Más vendido</span>}
              {p.isDestacado && <span className="badge badge-gold">Envío gratis</span>}
              {discount > 0 && <span className="badge badge-sale">−{discount} %</span>}
            </div>
            <h2 className="title" style={{ margin: '0 0 8px', fontSize: 24, lineHeight: 1.2 }}>
              {p.name}
            </h2>
            <div>
              <span className="price">{formatCOP(p.price)}</span>
              {p.originalPrice && <span className="old-price">{formatCOP(p.originalPrice)}</span>}
            </div>
            {p.shortDescription && <p className="desc">{p.shortDescription}</p>}

            {p.variants.length > 0 && (
              <div style={{ margin: '12px 0' }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  Elige una opción
                </div>
                <div className="chips">
                  {p.variants.map((v) => (
                    <button key={v.idVariant} className={`chip ${variantId === v.idVariant ? 'on' : ''}`} disabled={!v.available} onClick={() => setVariantId(v.idVariant)}>
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '12px 0', flexWrap: 'wrap' }}>
              <div className="qty">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">
                  −
                </button>
                <b style={{ minWidth: 20, textAlign: 'center' }}>{qty}</b>
                <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Más">
                  +
                </button>
              </div>
              {offers.map((o) => (
                <button key={o.quantity} className={`chip ${qty === o.quantity ? 'on' : ''}`} onClick={() => setQty(o.quantity)}>
                  {o.label ?? `Lleva ${o.quantity}`} · {formatCOP(o.totalPrice)}
                </button>
              ))}
            </div>

            <div className="facts">
              <span>Pagas al recibir.</span>
              <span>Llega en 3 a 7 días hábiles.</span>
              <span>{shipping === 0 ? 'Envío gratis en este producto.' : `Envío ${formatCOP(shipping)}.`}</span>
              <span>30 días por defecto de fábrica.</span>
            </div>

            <div className="summary" style={{ marginBottom: 12 }}>
              <div className="line">
                <span>Subtotal ({qty})</span>
                <span>{formatCOP(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="line" style={{ color: 'var(--ok)' }}>
                  <span>Ahorras</span>
                  <span>{formatCOP(savings)}</span>
                </div>
              )}
              <div className="line">
                <span>Envío</span>
                <span>{shipping === 0 ? 'Gratis' : formatCOP(shipping)}</span>
              </div>
              <div className="line total">
                <span>Total</span>
                <span>{formatCOP(subtotal + shipping)}</span>
              </div>
            </div>

            {failed && <div className="alert">No pudimos cargar los detalles. Puedes pedirlo en la web o por WhatsApp.</div>}
            <button className="btn btn-cta" style={{ width: '100%' }} disabled={!detail || needsVariant} onClick={() => setCheckout(true)}>
              {!detail && !failed ? 'Cargando…' : needsVariant ? 'Elige una opción' : 'Lo quiero, pedir ahora'}
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {wa && (
                <a className="btn btn-wa" href={wa} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: 'none' }}>
                  Pregúntanos por WhatsApp
                </a>
              )}
              <a className="btn" href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: 'none' }}>
                Ver en la web
              </a>
            </div>

            {p.benefits.length > 0 && (
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                {p.benefits.map((b) => (
                  <div key={b.title}>
                    <b>{b.title}</b>
                    <div className="desc">{b.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
