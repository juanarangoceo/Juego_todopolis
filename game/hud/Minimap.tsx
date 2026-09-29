'use client'

import { useEffect, useRef } from 'react'
import { drawCity, drawPlayerArrow } from './mapDraw'
import { look, player } from '../lib/input'
import { useGame } from '../lib/store'

export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null)
  const setMap = useGame((s) => s.setMap)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const px = 340
    canvas.width = canvas.height = px
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < 50) return
      last = now
      drawCity(ctx, { size: px, cx: player.x, cz: player.z, scale: 1.7, rotation: look.yaw })
      drawPlayerArrow(ctx, px / 2, px / 2, Math.PI - (player.heading - look.yaw), 14)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <button className="minimap glass" onClick={() => setMap(true)} aria-label="Abrir mapa">
      <canvas ref={ref} />
    </button>
  )
}
