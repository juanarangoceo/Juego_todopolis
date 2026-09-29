'use client'

import type { RapierRigidBody } from '@react-three/rapier'

/** Cuerpos físicos de los carros manejables, por id. */
export const carBodies = new Map<string, RapierRigidBody>()

/** Estado del carro que se está manejando. */
export const carControl = { speed: 0, heading: 0 }

/** Dónde quedó cada carro al entrar a una tienda (la ciudad se desmonta). */
export const carSaved = new Map<string, { x: number; y: number; z: number; yaw: number }>()
