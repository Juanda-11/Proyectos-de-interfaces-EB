import { MAX_VELOCITY, suggestDiameter, velocity } from './hydraulics.js'
import { simulate } from './simulation.js'

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

/**
 * Sube la altura de las bombas en pasos de 5 m hasta que ningún nodo de consumo quede
 * por debajo de la presión mínima, sin provocar sobrepresión en la red.
 */
export function fixPumpHead(network) {
  const pumps = network.nodes.filter((n) => n.type === 'pump')
  if (!pumps.length) return { network, changes: [] }

  const lowPressure = (net) => simulate(net).issues.some((i) => i.code === 'LOW_PRESSURE')
  let current = network
  let added = 0
  while (lowPressure(current) && added + PUMP_STEP <= MAX_PUMP_HEAD) {
    added += PUMP_STEP
    current = {
      ...network,
      nodes: network.nodes.map((n) =>
        n.type === 'pump' ? { ...n, pressure: Math.min(MAX_PUMP_HEAD, n.pressure + added) } : n,
      ),
    }
  }
  const ok =
    added > 0 &&
    !lowPressure(current) &&
    !simulate(current).issues.some((i) => i.code === 'HIGH_PRESSURE')
  if (!ok) return { network, changes: [] }

  const changes = current.nodes
    .map((n, i) => ({ n, was: network.nodes[i] }))
    .filter(({ n, was }) => n.pressure !== was.pressure)
    .map(({ n, was }) => ({
      type: 'pumpHead',
      elementId: n.id,
      from: was.pressure,
      to: n.pressure,
    }))
  return { network: current, changes }
}

export function optimize(network) {
  const diameters = fixDiameters(network)
  const pump = fixPumpHead(diameters.network)
  const changes = [...diameters.changes, ...pump.changes]
  const simulation = simulate(pump.network)
  return { network: pump.network, changes, simulation, message: describe(changes, simulation) }
}

function describe(changes, simulation) {
  const remaining = simulation.issues.filter((i) => i.severity !== 'info')
  if (!changes.length) {
    return remaining.length
      ? `No encontré ajustes automáticos; quedan ${remaining.length} problema(s) por revisar manualmente.`
      : 'La red ya cumple los criterios de diseño; no hay nada que optimizar.'
  }
  const d = changes
    .filter((c) => c.type === 'diameter')
    .map((c) => `${c.elementId} (DN${c.from}→DN${c.to})`)
  const p = changes
    .filter((c) => c.type === 'pumpHead')
    .map((c) => `${c.elementId} (${c.from}→${c.to} m)`)
  const parts = [
    d.length && `diámetros: ${d.join(', ')}`,
    p.length && `altura de bomba: ${p.join(', ')}`,
  ].filter(Boolean)
  const tail = remaining.length
    ? ` Quedan ${remaining.length} problema(s) por revisar.`
    : ' La red queda estable.'
  return `Apliqué ${changes.length} cambio(s) — ${parts.join('; ')}.${tail}`
}
