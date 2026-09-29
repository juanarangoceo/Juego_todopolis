'use client'

import { useGame } from '../lib/store'

export function Welcome({ ready }: { ready: boolean }) {
  const start = useGame((s) => s.start)
  return (
    <div className="welcome">
      <div className="panel glass">
        <div className="eyebrow">Bienvenido a</div>
        <h1 className="title">TODÓPOLIS</h1>
        <p style={{ fontSize: 17, margin: '6px 0 4px' }}>La ciudad de todo. Recórrela, entra a las tiendas y pide sin salir de la ciudad.</p>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>Pagas al recibir · Llega en 3 a 7 días hábiles</p>

        <div className="controls-grid hide-touch">
          <span className="kbd">W A S D</span>
          <span>Caminar · Shift para correr · Espacio para saltar</span>
          <span className="kbd">Ratón</span>
          <span>Clic en el juego y mueve el ratón para mirar</span>
          <span className="kbd">E</span>
          <span>Entrar, ver productos, hablar con el asesor</span>
          <span className="kbd">F</span>
          <span>Subir o bajar de un carro</span>
          <span className="kbd">M</span>
          <span>Mapa y taxi a cualquier tienda</span>
        </div>
        <div className="controls-grid only-touch">
          <span className="kbd">◎</span>
          <span>Joystick a la izquierda para moverte</span>
          <span className="kbd">↔</span>
          <span>Desliza a la derecha para mirar</span>
          <span className="kbd">E</span>
          <span>Botón de acción para entrar y comprar</span>
        </div>

        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Todópolis es una ciudad para mayores de 18 años: tiene bares y un distrito de lencería. Al entrar confirmas que eres mayor de edad.
        </p>
        <button className="btn btn-cta" style={{ width: '100%' }} disabled={!ready} onClick={start}>
          {ready ? 'Tengo 18 años o más, entrar' : 'Cargando la ciudad…'}
        </button>
        <a href="https://todopolis.online" style={{ display: 'inline-block', marginTop: 12, color: 'var(--muted)', fontSize: 14 }}>
          Soy menor de edad · Ir a la tienda
        </a>
      </div>
    </div>
  )
}
