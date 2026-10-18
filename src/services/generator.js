import { DESIGN_VELOCITY, suggestDiameter } from './hydraulics.js'

export const MAX_SECTORS = 8
const DEFAULT_SECTOR_DEMAND = 4 // L/s

const META = {
  tank: { label: 'Tanque', pressure: 15, elevation: 15 },
  pump: { label: 'Bomba', pressure: 30, elevation: 0 },
  junction: { label: 'Nodo', pressure: 22, elevation: 0 },
}

/** Extrae parámetros de una orden en español, p. ej. "red para 4 sectores de 6 L/s". */
export function parsePrompt(prompt = '') {
  const sectors = clamp(parseInt(prompt.match(/(\d+)\s*sector/i)?.[1] ?? '3', 10), 1, MAX_SECTORS)
  const demand = parseFloat(
    prompt.match(/(\d+(?:[.,]\d+)?)\s*l\s*\/?\s*s/i)?.[1]?.replace(',', '.') ??
      DEFAULT_SECTOR_DEMAND,
  )
  return { sectors, demand: clamp(demand, 0.5, 50) }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))

/**
 * Diseña una red tanque → bomba → nodo de distribución → n sectores, con diámetros
 * calculados para que ningún tramo supere la velocidad de diseño.
 */
export function generateNetwork({ sectors, demand = DEFAULT_SECTOR_DEMAND }) {
  const total = round1(sectors * demand)
  const mk = (id, type, x, y, name, extra = {}) => ({
    id,
    type,
    x,
    y,
    name,
    ...pick(META[type]),
    ...extra,
  })
  const nodes = [
    mk('T1', 'tank', 120, 300, 'Tanque T1'),
    mk('P1', 'pump', 280, 300, 'Bomba B1'),
    mk('J1', 'junction', 440, 300, 'Nodo J1', { demand: 0 }),
  ]
  const pipes = [pipe('a', 'T1', 'P1', total), pipe('b', 'P1', 'J1', total)]
  for (let i = 0; i < sectors; i++) {
    const id = `S${i + 1}`
    nodes.push(
      mk(id, 'junction', 660, 300 + (i - (sectors - 1) / 2) * 120, `Sector ${i + 1}`, { demand }),
    )
    pipes.push(pipe(`c${i}`, 'J1', id, demand))
  }
  return { nodes, pipes }
}

const pick = ({ pressure, elevation }) => ({ pressure, elevation })
const round1 = (v) => Math.round(v * 10) / 10
const pipe = (id, from, to, flow) => ({
  id,
  from,
  to,
  flow,
  diameter: suggestDiameter(flow, DESIGN_VELOCITY),
})
