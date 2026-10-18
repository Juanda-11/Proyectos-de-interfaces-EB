import { MAX_VELOCITY, suggestDiameter, velocity } from './hydraulics.js'
import { MAX_PRESSURE, MIN_PRESSURE, simulate } from './simulation.js'

/** Altura máxima que el optimizador asigna a una bomba (m). */
export const MAX_PUMP_HEAD = 100
const PUMP_STEP = 5

/**
 * Corrige los tramos que superan la velocidad máxima asignándoles el diámetro
 * comercial sugerido. Devuelve la red nueva y la lista de cambios; no modifica la entrada.
 */
export function fixDiameters(network) {
  const changes = []
  const pipes = network.pipes.map((p) => {
    if (velocity(p.flow, p.diameter) <= MAX_VELOCITY) return p
    const to = suggestDiameter(p.flow)
    if (to <= p.diameter) return p
    changes.push({ type: 'diameter', elementId: p.id, from: p.diameter, to })
    return { ...p, diameter: to }
  })
  return { network: { ...network, pipes }, changes }
}
