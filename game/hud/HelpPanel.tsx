'use client'

import { useGame } from '../lib/store'

export function HelpPanel() {
  const setHelp = useGame((s) => s.setHelp)
  return (
    <div className="overlay" onClick={() => setHelp(false)}>
      <div className="panel glass glass-strong narrow" onClick={(e) => e.stopPropagation()}>
        <button className="btn icon-btn close" onClick={() => setHelp(false)} aria-label="Cerrar">
          ✕
        </button>
        <div className="eyebrow">Cómo se juega</div>
        <h2 className="title" style={{ margin: '4px 0 8px' }}>
          Controles
        </h2>
        <div className="controls-grid" style={{ margin: '8px 0' }}>
          <span className="kbd">W A S D</span>
          <span>Moverte (también las flechas)</span>
          <span className="kbd">Shift</span>
          <span>Correr</span>
          <span className="kbd">Espacio</span>
          <span>Saltar · frenar en el carro</span>
          <span className="kbd">Ratón</span>
          <span>Mirar · rueda para acercar la cámara</span>
          <span className="kbd">E</span>
          <span>Interactuar</span>
          <span className="kbd">F</span>
          <span>Subir o bajar del carro</span>
          <span className="kbd">M</span>
          <span>Mapa y taxi</span>
          <span className="kbd">Esc</span>
          <span>Cerrar paneles · soltar el ratón</span>
        </div>
        <div className="eyebrow" style={{ marginTop: 12 }}>
          TodoCoins
        </div>
        <p className="desc">
          Recoge monedas en las aceras, cumple las misiones del día y gira la ruleta de los bares. Cada pedido suma 100. Las monedas y misiones del mapa se renuevan cada día.
        </p>
      </div>
    </div>
  )
}
