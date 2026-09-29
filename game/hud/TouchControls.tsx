'use client'

import { useRef, useState } from 'react'
import { fireAction, look, stick } from '../lib/input'
import { useGame } from '../lib/store'

// Controles táctiles: joystick a la izquierda, arrastrar a la derecha para
// mirar, y botones de acción. Solo se muestran en pantallas táctiles.

export function TouchControls() {
  const [base, setBase] = useState<{ x: number; y: number } | null>(null)
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null)
  const stickId = useRef<number | null>(null)
  const lookId = useRef<number | null>(null)
  const lastLook = useRef({ x: 0, y: 0 })
  const prompt = useGame((s) => s.prompt)
  const inCar = useGame((s) => s.inCar)
  const setMap = useGame((s) => s.setMap)
  const R = 55

  return (
    <div className="touch only-touch">
      <div
        className="stick-zone"
        onPointerDown={(e) => {
          stickId.current = e.pointerId
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          setBase({ x: e.clientX, y: e.clientY })
          setKnob({ x: e.clientX, y: e.clientY })
          stick.active = true
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== stickId.current || !base) return
          let dx = e.clientX - base.x
          let dy = e.clientY - base.y
          const d = Math.hypot(dx, dy)
          if (d > R) {
            dx = (dx / d) * R
            dy = (dy / d) * R
          }
          setKnob({ x: base.x + dx, y: base.y + dy })
          stick.x = dx / R
          stick.y = -dy / R
        }}
        onPointerUp={(e) => {
          if (e.pointerId !== stickId.current) return
          stickId.current = null
          setBase(null)
          setKnob(null)
          stick.x = 0
          stick.y = 0
          stick.active = false
        }}
        onPointerCancel={() => {
          stickId.current = null
          setBase(null)
          setKnob(null)
          stick.x = stick.y = 0
          stick.active = false
        }}
      >
        {base && <div className="stick-base" style={{ left: base.x, top: base.y }} />}
        {knob && <div className="stick-knob" style={{ left: knob.x, top: knob.y }} />}
      </div>
      <div
        className="look-zone"
        onPointerDown={(e) => {
          lookId.current = e.pointerId
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          lastLook.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== lookId.current) return
          const dx = e.clientX - lastLook.current.x
          const dy = e.clientY - lastLook.current.y
          lastLook.current = { x: e.clientX, y: e.clientY }
          look.yaw -= dx * 0.006
          look.pitch = Math.min(1.1, Math.max(-0.35, look.pitch + dy * 0.004))
        }}
        onPointerUp={() => (lookId.current = null)}
        onPointerCancel={() => (lookId.current = null)}
      />
      <div className="actions">
        <button className="glass" onClick={() => setMap(true)}>
          MAPA
        </button>
        <button className="glass" onClick={() => fireAction('car')} style={{ opacity: inCar || prompt?.key === 'F' ? 1 : 0.5 }}>
          {inCar ? 'BAJAR' : 'CARRO'}
        </button>
        <button className="glass" style={{ gridColumn: 'span 2', width: '100%', borderRadius: 18, opacity: prompt?.key === 'E' ? 1 : 0.5 }} onClick={() => fireAction('interact')}>
          ACCIÓN
        </button>
      </div>
    </div>
  )
}
