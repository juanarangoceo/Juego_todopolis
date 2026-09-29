'use client'

import { useState } from 'react'
import { useGame } from '../lib/store'
import { today } from '../lib/persist'

// Ruleta diaria del bar. Solo da TodoCoins: premios en plata o descuentos
// reales son una decisión comercial que todavía no está tomada.

const PRIZES = [10, 25, 15, 50, 20, 100, 30, 15]
const COLORS = ['#ff2d55', '#ff4fd8', '#c28bff', '#35e0ff', '#7dff6a', '#ffd84a', '#ffa04d', '#5cf2c2']

export function SpinPanel() {
  const setSpin = useGame((s) => s.setSpin)
  const addCoins = useGame((s) => s.addCoins)
  const markSpun = useGame((s) => s.markSpun)
  const spun = useGame((s) => s.progress.spunOn === today())
  const [angle, setAngle] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)

  const slice = 360 / PRIZES.length
  const gradient = `conic-gradient(${PRIZES.map((_, i) => `${COLORS[i]} ${i * slice}deg ${(i + 1) * slice}deg`).join(', ')})`

  const spin = () => {
    if (spun || spinning) return
    const idx = Math.floor(Math.random() * PRIZES.length)
    // El puntero está arriba: la porción `idx` tiene que terminar en 0°.
    const target = 360 * 6 + (360 - (idx * slice + slice / 2))
    setSpinning(true)
    setAngle(target)
    setTimeout(() => {
      setSpinning(false)
      setResult(PRIZES[idx])
      markSpun()
      addCoins(PRIZES[idx], `Ruleta: +${PRIZES[idx]} TodoCoins`)
    }, 3300)
  }

  return (
    <div className="overlay" onClick={() => !spinning && setSpin(false)}>
      <div className="panel glass glass-strong narrow" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <button className="btn icon-btn close" onClick={() => !spinning && setSpin(false)} aria-label="Cerrar">
          ✕
        </button>
        <div className="eyebrow">Una vez al día</div>
        <h2 className="title" style={{ margin: '4px 0' }}>
          Ruleta de la casa
        </h2>
        <div className="wheel-pointer" />
        <div className="wheel" style={{ background: gradient, transform: `rotate(${angle}deg)` }}>
          {PRIZES.map((p, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `rotate(${i * slice + slice / 2}deg) translateY(-88px) translateX(-50%)`,
                transformOrigin: '0 0',
                fontWeight: 900,
                fontFamily: 'var(--font-title)',
                color: '#16161d',
              }}
            >
              {p}
            </span>
          ))}
        </div>
        {result !== null ? (
          <p className="title" style={{ fontSize: 22, color: 'var(--gold)' }}>
            Ganaste {result} TodoCoins
          </p>
        ) : spun ? (
          <p style={{ color: 'var(--muted)' }}>Ya giraste hoy. Vuelve mañana.</p>
        ) : null}
        <button className="btn btn-cta" style={{ width: '100%' }} disabled={spun || spinning} onClick={spin}>
          {spinning ? 'Girando…' : spun ? 'Vuelve mañana' : 'Girar'}
        </button>
      </div>
    </div>
  )
}
