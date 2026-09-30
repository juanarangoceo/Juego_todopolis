// Personajes jugables. Diseños propios en estilo chibi (cabeza grande, cuerpo
// corto), pensados para el público de Todópolis: cada uno "vive" en un distrito.

export type HairStyle = 'short' | 'long' | 'ponytail' | 'bun' | 'spiky' | 'curly'
export type Accessory = 'none' | 'bow' | 'headphones' | 'cap' | 'chef' | 'crown' | 'hat' | 'flower'

export interface CharacterLook {
  skin: string
  hair: string
  hairStyle: HairStyle
  top: string
  bottom: string
  shoes: string
  accent: string
  accessory: Accessory
  /** Falda o vestido en lugar de pantalón. */
  skirt?: boolean
  /** Morral a la espalda. */
  backpack?: boolean
}

export interface CharacterDef {
  id: string
  name: string
  title: string
  description: string
  look: CharacterLook
}

export const SKIN_TONES = ['#f6d7c3', '#eab893', '#c98b62', '#9a6340', '#6b4128']

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'valen',
    name: 'Valen',
    title: 'La Fashionista',
    description: 'Vive en la Pasarela Neón. Sabe qué se va a usar antes que nadie.',
    look: { skin: SKIN_TONES[1], hair: '#5a2e1b', hairStyle: 'long', top: '#ff6fae', bottom: '#ffd1e4', shoes: '#ffffff', accent: '#ffd84a', accessory: 'bow', skirt: true },
  },
  {
    id: 'tomi',
    name: 'Tomi',
    title: 'El Gamer',
    description: 'Si tiene luces y batería, Tomi ya lo probó en Tech Tower.',
    look: { skin: SKIN_TONES[0], hair: '#2b2b3a', hairStyle: 'spiky', top: '#3b82f6', bottom: '#2d3a55', shoes: '#e8e8e8', accent: '#35e0ff', accessory: 'headphones' },
  },
  {
    id: 'sofi',
    name: 'Sofi',
    title: 'La Fit',
    description: 'Entrena en Arena Pulse y conoce cada banda de resistencia.',
    look: { skin: SKIN_TONES[2], hair: '#1f140e', hairStyle: 'ponytail', top: '#4ade80', bottom: '#1f2937', shoes: '#f97316', accent: '#ffffff', accessory: 'none' },
  },
  {
    id: 'leo',
    name: 'Leo',
    title: 'El Chef',
    description: 'Dueño de medio Casa Nube. Su freidora de aire es leyenda.',
    look: { skin: SKIN_TONES[3], hair: '#1a1210', hairStyle: 'short', top: '#ffffff', bottom: '#374151', shoes: '#3b2a20', accent: '#ef4444', accessory: 'chef' },
  },
  {
    id: 'dani',
    name: 'Dani',
    title: 'La Glam',
    description: 'Reina del Boulevard Glow. Nunca sale sin su rutina de skincare.',
    look: { skin: SKIN_TONES[4], hair: '#2a1a12', hairStyle: 'curly', top: '#a855f7', bottom: '#e9d5ff', shoes: '#ffd84a', accent: '#ffd84a', accessory: 'crown', skirt: true },
  },
  {
    id: 'mateo',
    name: 'Mateo',
    title: 'El Aventurero',
    description: 'Recorre todos los distritos buscando la mejor oferta.',
    look: { skin: SKIN_TONES[1], hair: '#8a5a2b', hairStyle: 'short', top: '#b45309', bottom: '#556b2f', shoes: '#3b2a20', accent: '#facc15', accessory: 'hat', backpack: true },
  },
]

export interface PlayerCharacter {
  id: string
  name: string
  skin: string
}

export function lookFor(pc: PlayerCharacter | null | undefined): CharacterLook {
  const def = CHARACTERS.find((c) => c.id === pc?.id) ?? CHARACTERS[0]
  return { ...def.look, skin: pc?.skin ?? def.look.skin }
}
