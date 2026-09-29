'use client'

import { useMemo } from 'react'
import { formatCOP } from '@/lib/catalog-types'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { currentStore, productsForStore, useGame } from '../lib/store'
import { DISTRICTS } from '../lib/city'
import { filteredProducts, PAGE_SIZE } from '../lib/shelves'

// Asesor(a) del local. Por ahora responde con opciones fijas que filtran las
// vitrinas; la siguiente fase es la voz de Lucy (`voiceAssistant` en Sanity).

export function AdvisorPanel() {
  const store = currentStore()
  const setAdvisor = useGame((s) => s.setAdvisor)
  const setFilter = useGame((s) => s.setShelfFilter)
  const setSpin = useGame((s) => s.setSpin)
  const openProduct = useGame((s) => s.openProduct)
  const catalog = useGame((s) => s.catalog)
  const spunToday = useGame((s) => s.progress.spunOn === s.progress.day)
  const products = useMemo(() => (store ? productsForStore(store, catalog) : []), [store, catalog])

  if (!store) return null
  const color = DISTRICTS[store.district].color
  const wa = buildWhatsAppUrl({
    phone: catalog?.whatsappPhone,
    pageUrl: 'https://todopolis.online',
    productName: null,
  })
  const top = filteredProducts(products, 'best').slice(0, 3)

  const apply = (f: 'all' | 'best' | 'under50' | 'under100') => {
    setFilter(f)
    setAdvisor(false)
  }
  const count = (f: string) => filteredProducts(products, f).length

  return (
    <div className="overlay" onClick={() => setAdvisor(false)}>
      <div className="panel glass glass-strong narrow" onClick={(e) => e.stopPropagation()}>
        <button className="btn icon-btn close" onClick={() => setAdvisor(false)} aria-label="Cerrar">
          ✕
        </button>
        <div className="eyebrow" style={{ color }}>
          {store.name}
        </div>
        <h2 className="title" style={{ margin: '4px 0 12px' }}>
          {store.advisor.name}
        </h2>
        <div className="chat">
          <div className="bubble">{store.advisor.greeting}</div>
          {store.kind === 'bar' ? (
            <>
              <button className="btn btn-cta" disabled={spunToday} onClick={() => { setAdvisor(false); setSpin(true) }}>
                {spunToday ? 'Ya giraste la ruleta hoy' : 'Girar la ruleta del día'}
              </button>
              <div className="bubble">Las tiendas están afuera: toma un taxi desde el mapa (tecla M) y vuelves cuando quieras.</div>
            </>
          ) : (
            <>
              <div className="eyebrow">¿Qué te muestro?</div>
              <div className="chips">
                <button className="chip" onClick={() => apply('best')} disabled={!count('best')}>
                  Lo más vendido ({count('best')})
                </button>
                <button className="chip" onClick={() => apply('under50')} disabled={!count('under50')}>
                  Hasta {formatCOP(50_000)} ({count('under50')})
                </button>
                <button className="chip" onClick={() => apply('under100')} disabled={!count('under100')}>
                  Hasta {formatCOP(100_000)} ({count('under100')})
                </button>
                <button className="chip" onClick={() => apply('all')}>
                  Todo ({products.length})
                </button>
              </div>
              {top.length > 0 && (
                <>
                  <div className="eyebrow">Te puede interesar</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {top.map((p) => (
                      <button key={p.id} className="btn" style={{ justifyContent: 'space-between', textAlign: 'left' }} onClick={() => { setAdvisor(false); openProduct(p) }}>
                        <span>{p.name}</span>
                        <b>{formatCOP(p.price)}</b>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="bubble" style={{ fontSize: 14 }}>
                Pagas al recibir. Llega en 3 a 7 días hábiles; el envío cuesta {formatCOP(12_000)} y es gratis en Destacados.
                {products.length > PAGE_SIZE ? ' Para ver más vitrinas, pisa el círculo «MÁS» junto a la pared.' : ''}
              </div>
            </>
          )}
          {wa && (
            <a className="btn btn-wa" href={wa} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
