'use client'

import { BLOCK, DISTRICTS, HALF, LOTS, ROAD, STORES, storeGeometry } from '../lib/city'

export interface MapView {
  size: number
  /** Centro del mapa en el mundo. */
  cx: number
  cz: number
  /** Píxeles por metro. */
  scale: number
  /** Giro de la cámara (yaw); 0 = norte arriba. */
  rotation: number
  labels?: boolean
  highlight?: string | null
}

/** Dibuja la ciudad. Lo usan el minimapa (girando con la cámara) y el mapa grande. */
export function drawCity(ctx: CanvasRenderingContext2D, v: MapView) {
  const { size, cx, cz, scale: s, rotation: t } = v
  const c = Math.cos(t)
  const sn = Math.sin(t)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = '#0a0720'
  ctx.fillRect(0, 0, size, size)

  const half = size / 2
  ctx.setTransform(s * c, s * sn, -s * sn, s * c, half - s * (c * cx - sn * cz), half - s * (sn * cx + c * cz))

  // Isla y calles
  ctx.fillStyle = '#1a1630'
  const edge = HALF + ROAD / 2
  ctx.fillRect(-edge, -edge, edge * 2, edge * 2)

  // Manzanas por distrito
  for (const l of LOTS) {
    const d = DISTRICTS[l.district]
    ctx.fillStyle = l.type === 'park' ? '#1d4a3a' : l.type === 'plaza' ? '#4a3b20' : d.color + '40'
    ctx.fillRect(l.x - BLOCK / 2, l.z - BLOCK / 2, BLOCK, BLOCK)
  }

  // Tiendas
  for (const st of STORES) {
    const g = storeGeometry(st)
    const col = DISTRICTS[st.district].color
    ctx.fillStyle = col
    const r = st.id === v.highlight ? 7 : 4.5
    ctx.beginPath()
    ctx.arc(g.door[0], g.door[1], r / Math.max(0.6, s * 0.6), 0, Math.PI * 2)
    ctx.fill()
  }

  if (v.labels) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.textAlign = 'center'
    for (const st of STORES) {
      const g = storeGeometry(st)
      const dx = g.door[0] - cx
      const dz = g.door[1] - cz
      const px = half + s * (c * dx - sn * dz)
      const py = half + s * (sn * dx + c * dz)
      ctx.font = `800 ${Math.max(10, size / 60)}px Montserrat, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(st.sign, px, py - 8)
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

export function drawPlayerArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size = 9) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(size * 0.7, size * 0.8)
  ctx.lineTo(0, size * 0.35)
  ctx.lineTo(-size * 0.7, size * 0.8)
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#35e0ff'
  ctx.shadowBlur = 10
  ctx.fill()
  ctx.restore()
}
