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
  const demand = parseFloat(prompt.match(/(\d+(?:[.,]\d+)?)\s*l\s*\/?\s*s/i)?.[1]?.replace(',', '.') ?? DEFAULT_SECTOR_DEMAND)
  return { sectors, demand: clamp(demand, 0.5, 50) }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))
