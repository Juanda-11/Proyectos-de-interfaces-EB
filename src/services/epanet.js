import { pipeLength } from './hydraulics.js'
import { VALVE_K } from './simulation.js'

const DEFAULT_ROUGHNESS = 130
const row = (...cols) => cols.join('\t')
const num = (v) => String(Math.round(v * 1000) / 1000)

/**
 * Convierte la red del editor en un archivo EPANET 2 (.inp) en unidades LPS y Hazen-Williams.
 *
 * - Tanques → embalses de altura constante (cota + nivel).
 * - Bombas y válvulas son nodos en el editor pero enlaces en EPANET: cada una se
 *   divide en un nodo de entrada (`ID_in`) y otro de salida (`ID_out`) unidos por el enlace.
 * - Los caudales de las tuberías no se exportan: EPANET los calcula a partir de las demandas.
 */
export function toEpanet(network, { title = 'HydroGraph AI' } = {}) {
  const ids = uniqueIds(network.nodes.map((n) => n.id))
  const nodeById = new Map(network.nodes.map((n) => [n.id, n]))
  const nodeLabel = (n) => ids.get(n.id)

  // Extremos de cada tubería: si el nodo se divide, entra por _in y sale por _out
  const split = (n) => n.type === 'pump' || n.type === 'valve'
  const endpoint = (id, side) => {
    const n = nodeById.get(id)
    if (!split(n)) return nodeLabel(n)
    return `${nodeLabel(n)}_${side === 'to' ? 'in' : 'out'}`
  }

  const junctions = []
  const reservoirs = []
  const coordinates = []
  const pumps = []
  const valves = []
  const curves = []

  for (const n of network.nodes) {
    const id = nodeLabel(n)
    const xy = [num(n.x), num(-n.y)] // EPANET dibuja con el eje Y hacia arriba
    if (n.type === 'tank') {
      reservoirs.push(row(id, num(n.elevation + n.pressure)))
      coordinates.push(row(id, ...xy))
    } else if (split(n)) {
      for (const suffix of ['in', 'out']) {
        junctions.push(row(`${id}_${suffix}`, num(n.elevation), 0))
        coordinates.push(row(`${id}_${suffix}`, num(n.x + (suffix === 'in' ? -12 : 12)), xy[1]))
      }
      const through = network.pipes.filter((p) => p.to === n.id || p.from === n.id)
      if (n.type === 'pump') {
        const design = Math.max(1, ...through.map((p) => p.flow))
        pumps.push(row(id, `${id}_in`, `${id}_out`, 'HEAD', `C_${id}`))
        curves.push(row(`C_${id}`, num(design), num(n.pressure)))
      } else {
        const diameter = through[0]?.diameter ?? 100
        valves.push(row(id, `${id}_in`, `${id}_out`, num(diameter), 'TCV', num(VALVE_K), 0))
      }
    } else {
      junctions.push(row(id, num(n.elevation), num(n.demand ?? 0)))
      coordinates.push(row(id, ...xy))
    }
  }

  const pipes = network.pipes.map((p) => {
    const length = p.length ?? pipeLength(nodeById.get(p.from), nodeById.get(p.to))
    return row(sanitize(p.id), endpoint(p.from, 'from'), endpoint(p.to, 'to'), num(length), num(p.diameter), p.roughness ?? DEFAULT_ROUGHNESS, 0, 'Open')
  })

  const section = (name, header, rows) => [`[${name}]`, `;${header}`, ...rows, ''].join('\n')
  return [
    section('TITLE', '', [title]),
    section('JUNCTIONS', 'ID\tElev\tDemand', junctions),
    section('RESERVOIRS', 'ID\tHead', reservoirs),
    section('PIPES', 'ID\tNode1\tNode2\tLength\tDiameter\tRoughness\tMinorLoss\tStatus', pipes),
    section('PUMPS', 'ID\tNode1\tNode2\tParameters', pumps),
    section('VALVES', 'ID\tNode1\tNode2\tDiameter\tType\tSetting\tMinorLoss', valves),
    section('CURVES', 'ID\tX-Value\tY-Value', curves),
    section('COORDINATES', 'Node\tX-Coord\tY-Coord', coordinates),
    section('OPTIONS', '', ['Units\tLPS', 'Headloss\tH-W', 'Pressure\tmeters']),
    section('TIMES', '', ['Duration\t0']),
    '[END]\n',
  ].join('\n')
}

/** EPANET no admite espacios ni punto y coma en los identificadores. */
const sanitize = (id) => id.replace(/[^\w-]/g, '_').slice(0, 28)

function uniqueIds(list) {
  const used = new Set()
  const map = new Map()
  for (const id of list) {
    let candidate = sanitize(id)
    for (let i = 2; used.has(candidate); i++) candidate = `${sanitize(id).slice(0, 24)}_${i}`
    used.add(candidate)
    map.set(id, candidate)
  }
  return map
}
