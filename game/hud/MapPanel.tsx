'use client'

import { useEffect, useRef, useState } from 'react'
import { drawCity, drawPlayerArrow } from './mapDraw'
import { DISTRICTS, HALF, ROAD, SPAWN, STORES, storeGeometry } from '../lib/city'
import { player } from '../lib/input'
import { useGame } from '../lib/store'

// Mapa grande con taxi: en una ciudad de compras nadie quiere caminar diez
// cuadras para llegar a la tienda que ya sabe que busca.

export function MapPanel() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const setMap = useGame((s) => s.setMap)
  const mode = useGame((s) => s.mode)
  const exitStore = useGame((s) => s.exitStore)
  const requestTeleport = useGame((s) => s.requestTeleport)
  const toast = useGame((s) => s.toast)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const px = 900
    canvas.width = canvas.height = px
    const edge = HALF + ROAD / 2 + 6
    const scale = px / (edge * 2)
    drawCity(ctx, { size: px, cx: 0, cz: 0, scale, rotation: 0, labels: true, highlight: hover })
    if (mode === 'city') drawPlayerArrow(ctx, px / 2 + player.x * scale, px / 2 + player.z * scale, Math.PI - player.heading, 14)
  }, [hover, mode])

  const taxi = (id: string | null) => {
    const st = STORES.find((s) => s.id === id)
    const target = st
      ? (() => {
          const g = storeGeometry(st)
          // El taxi para en la calle, frente a la puerta: se ve el letrero completo.
          return { x: g.exit[0] + g.dir[0] * 5, z: g.exit[1] + g.dir[1] * 5, yaw: Math.atan2(g.dir[0], g.dir[1]) }
        })()
      : { x: SPAWN[0], z: SPAWN[2], yaw: 0 }
    if (mode === 'interior') exitStore()
    // El jugador de la ciudad lo aplica en cuanto está montado.
    requestTeleport(target)
    setMap(false)
    toast(st ? `Taxi a ${st.name}` : 'Taxi a la Plaza Todópolis')
  }

  return (
    <div className="overlay" onClick={() => setMap(false)}>
      <div className="panel glass glass-strong" onClick={(e) => e.stopPropagation()}>
        <button className="btn icon-btn close" onClick={() => setMap(false)} aria-label="Cerrar">
          ✕
        </button>
        <div className="eyebrow">Mapa de la ciudad</div>
        <h2 className="title" style={{ margin: '4px 0 14px' }}>
          ¿A dónde vamos?
        </h2>
        <div className="map-wrap">
          <canvas ref={ref} className="map-canvas" />
          <div className="store-list">
            <button onClick={() => taxi(null)}>
              <span className="dot" style={{ background: DISTRICTS.plaza.color }} />
              <span>
                <b>Plaza Todópolis</b>
                <br />
                <small style={{ color: 'var(--muted)' }}>Punto de partida</small>
              </span>
            </button>
            {STORES.map((s) => (
              <button key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onClick={() => taxi(s.id)}>
                <span className="dot" style={{ background: DISTRICTS[s.district].color }} />
                <span>
                  <b>{s.name}</b>
                  <br />
                  <small style={{ color: 'var(--muted)' }}>
                    {DISTRICTS[s.district].name}
                    {s.adult ? ' · +18' : ''}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>Toca una tienda para tomar un taxi hasta la puerta.</p>
      </div>
    </div>
  )
}
