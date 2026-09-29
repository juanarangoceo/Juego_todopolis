'use client'

import { useEffect, useState } from 'react'
import { DISTRICTS } from '../lib/city'
import { fireAction } from '../lib/input'
import { currentStore, isUiBlocking, MISSIONS, useGame } from '../lib/store'
import { Minimap } from './Minimap'
import { MapPanel } from './MapPanel'
import { ProductPanel } from './ProductPanel'
import { AdvisorPanel } from './AdvisorPanel'
import { SpinPanel } from './SpinPanel'
import { HelpPanel } from './HelpPanel'
import { TouchControls } from './TouchControls'

function DistrictToast() {
  const district = useGame((s) => s.district)
  const mode = useGame((s) => s.mode)
  const [shown, setShown] = useState<{ key: number; id: typeof district } | null>(null)
  useEffect(() => {
    if (mode !== 'city') return
    setShown({ key: Date.now(), id: district })
  }, [district, mode])
  if (!shown || mode !== 'city') return null
  const d = DISTRICTS[shown.id]
  return (
    <div key={shown.key} className="district-toast glass">
      <div className="title" style={{ fontSize: 20, color: d.color }}>
        {d.name}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{d.tagline}</div>
    </div>
  )
}

function Missions({ open }: { open: boolean }) {
  const progress = useGame((s) => s.progress)
  return (
    <div className={`missions glass ${open ? 'open' : ''}`}>
      <div className="eyebrow">Misiones de hoy</div>
      <ul>
        {MISSIONS.map((m) => {
          const done = progress.missionsDone.includes(m.id)
          const n = Math.min(m.goal, m.progress(progress))
          return (
            <li key={m.id} className={done ? 'done' : ''}>
              <span>{m.title}</span>
              <b style={{ whiteSpace: 'nowrap' }}>{done ? `+${m.reward}` : m.goal > 1 ? `${n}/${m.goal}` : `+${m.reward}`}</b>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Hud() {
  const coins = useGame((s) => s.progress.coins)
  const prompt = useGame((s) => s.prompt)
  const toasts = useGame((s) => s.toasts)
  const mode = useGame((s) => s.mode)
  const district = useGame((s) => s.district)
  const product = useGame((s) => s.product)
  const advisorOpen = useGame((s) => s.advisorOpen)
  const mapOpen = useGame((s) => s.mapOpen)
  const helpOpen = useGame((s) => s.helpOpen)
  const spinOpen = useGame((s) => s.spinOpen)
  const catalogError = useGame((s) => s.catalogError)
  const blocking = useGame(isUiBlocking)
  const setMap = useGame((s) => s.setMap)
  const setHelp = useGame((s) => s.setHelp)
  const [missionsOpen, setMissionsOpen] = useState(false)
  const store = mode === 'interior' ? currentStore() : null
  const place = store ? { name: store.name, color: DISTRICTS[store.district].color } : { name: DISTRICTS[district].name, color: DISTRICTS[district].color }

  return (
    <>
      <div className="hud">
        <div className="topbar">
          <div className="left">
            <div className="pill glass logo">TODÓPOLIS</div>
            <div className="pill glass hide-mobile" style={{ color: place.color }}>
              {place.name}
            </div>
          </div>
          <div className="right">
            <div className="pill glass" title="TodoCoins">
              <span className="coin-dot" />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{coins}</span>
            </div>
            <button className="btn icon-btn glass only-touch" onClick={() => setMissionsOpen((v) => !v)} aria-label="Misiones">
              ★
            </button>
            <button className="btn glass hide-touch" onClick={() => setMap(true)}>
              Mapa <span className="kbd" style={{ height: 22, minWidth: 22 }}>M</span>
            </button>
            <button className="btn icon-btn glass" onClick={() => setHelp(true)} aria-label="Ayuda">
              ?
            </button>
          </div>
        </div>

        {mode === 'city' && <Minimap />}
        <Missions open={missionsOpen} />

        {prompt && !blocking && (
          <div className="prompt glass">
            <button onClick={() => fireAction(prompt.key === 'F' ? 'car' : 'interact')}>
              <span className="kbd">{prompt.key}</span>
              <span>{prompt.text}</span>
            </button>
          </div>
        )}

        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className="toast glass">
              {t.text}
            </div>
          ))}
        </div>

        {catalogError && (
          <div className="glass" style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', padding: '8px 14px', fontSize: 13 }}>
            Las vitrinas no cargaron. Revisa tu conexión y recarga la página.
          </div>
        )}
      </div>

      <DistrictToast />
      <TouchControls />
      {product && <ProductPanel />}
      {advisorOpen && <AdvisorPanel />}
      {spinOpen && <SpinPanel />}
      {mapOpen && <MapPanel />}
      {helpOpen && <HelpPanel />}
    </>
  )
}
