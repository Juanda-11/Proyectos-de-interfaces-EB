import { t } from '../i18n.js'
import {
  MAX_VELOCITY,
  MIN_VELOCITY,
  headLoss,
  minorLoss,
  pipeLength,
  suggestDiameter,
  velocity,
} from './hydraulics.js'

/** Presión mínima y máxima de servicio (m.c.a.). */
export const MIN_PRESSURE = 10
export const MAX_PRESSURE = 70
/** Coeficiente K de una válvula parcialmente abierta. */
export const VALVE_K = 2.5
const DEFAULT_ROUGHNESS = 130

const SEVERITY_RANK = { info: 0, warning: 1, critical: 2 }

/**
 * Resuelve la red como un árbol de alturas piezométricas que parte de los tanques:
 * cada nodo hereda la altura de su padre menos la pérdida del tramo, más la altura
 * de la bomba o menos la pérdida local de la válvula. Los tramos que cierran un
 * anillo se evalúan (velocidad, pérdida) pero no modifican las presiones.
 */
export function simulate(net, { metersPerUnit, lang } = {}) {
  const nodeById = new Map(net.nodes.map((n) => [n.id, n]))
  const issues = []
  const issue = (severity, code, elementId, message, suggestion) =>
    issues.push({ severity, code, elementId, message, ...(suggestion ? { suggestion } : {}) })

  const pipes = net.pipes.map((p) => {
    const a = nodeById.get(p.from)
    const b = nodeById.get(p.to)
    const length = p.length ?? pipeLength(a, b, metersPerUnit)
    const v = velocity(p.flow, p.diameter)
    const hf = headLoss(p.flow, p.diameter, length, p.roughness ?? DEFAULT_ROUGHNESS)
    return {
      id: p.id,
      from: p.from,
      to: p.to,
      length: round(length, 1),
      velocity: round(v, 3),
      headLoss: round(hf, 3),
      gradient: round(length ? (hf / length) * 1000 : 0, 2),
      status: v > MAX_VELOCITY ? 'warn' : 'ok',
      suggestedDiameter: suggestDiameter(p.flow),
      _hf: hf,
      _v: v,
    }
  })
  const pipeById = new Map(pipes.map((p) => [p.id, p]))

  const adjacency = new Map(net.nodes.map((n) => [n.id, []]))
  for (const p of net.pipes) {
    adjacency.get(p.from).push({ pipe: p.id, other: p.to })
    adjacency.get(p.to).push({ pipe: p.id, other: p.from })
  }

  // Alturas piezométricas: recorrido en anchura desde los tanques
  const solved = new Map() // id -> { head, pressure }
  const treePipes = new Set()
  const queue = []
  for (const n of net.nodes.filter((x) => x.type === 'tank')) {
    const head = n.elevation + n.pressure
    solved.set(n.id, { head, pressure: n.pressure })
    queue.push(n.id)
  }
  while (queue.length) {
    const id = queue.shift()
    const out = solved.get(id).head
    for (const { pipe, other } of adjacency.get(id)) {
      if (solved.has(other)) continue
      const link = pipeById.get(pipe)
      const v = nodeById.get(other)
      let head = out - link._hf
      if (v.type === 'valve') head -= minorLoss(VALVE_K, link._v)
      if (v.type === 'pump') head += v.pressure // la bomba entrega su altura a la salida
      solved.set(other, { head, pressure: head - v.elevation })
      treePipes.add(pipe)
      queue.push(other)
    }
  }

  const hasSource = net.nodes.some((n) => n.type === 'tank')
  if (!hasSource) issue('critical', 'NO_SOURCE', null, t(lang, 'noSource'), t(lang, 'noSourceFix'))

  const nodes = net.nodes.map((n) => {
    const s = solved.get(n.id)
    let status = 'ok'
    if (!s) {
      status = 'disconnected'
      if (hasSource)
        issue(
          'warning',
          'DISCONNECTED',
          n.id,
          t(lang, 'disconnected', label(n)),
          t(lang, 'disconnectedFix'),
        )
    } else if (n.type !== 'tank' && s.pressure < 0) {
      status = 'critical'
      issue(
        'critical',
        'NEGATIVE_PRESSURE',
        n.id,
        t(lang, 'negativePressure', label(n), round(s.pressure, 1)),
        t(lang, 'raiseHead'),
      )
    } else if (n.type === 'junction' && s.pressure < MIN_PRESSURE) {
      status = 'low'
      issue(
        'warning',
        'LOW_PRESSURE',
        n.id,
        t(lang, 'lowPressure', label(n), round(s.pressure, 1), MIN_PRESSURE),
        t(lang, 'raiseHead'),
      )
    } else if (n.type !== 'tank' && s.pressure > MAX_PRESSURE) {
      status = 'high'
      issue(
        'warning',
        'HIGH_PRESSURE',
        n.id,
        t(lang, 'highPressure', label(n), round(s.pressure, 1), MAX_PRESSURE),
        t(lang, 'highPressureFix'),
      )
    }
    return {
      id: n.id,
      status,
      head: s ? round(s.head, 2) : null,
      pressure: s ? round(s.pressure, 2) : null,
    }
  })

  for (const p of pipes) {
    const name = `${p.from}→${p.to}`
    if (p.status === 'warn') {
      issue(
        'warning',
        'HIGH_VELOCITY',
        p.id,
        t(lang, 'highVelocity', name, round(p._v, 2), MAX_VELOCITY),
        t(lang, 'useDn', p.suggestedDiameter),
      )
    } else if (p._v > 0 && p._v < MIN_VELOCITY) {
      issue('info', 'LOW_VELOCITY', p.id, t(lang, 'lowVelocity', name, round(p._v, 2)))
    }
  }

  const connected = nodes.filter((n) => n.pressure !== null && n.status !== 'disconnected')
  const consumers = connected.filter((n) => nodeById.get(n.id).type !== 'tank')
  const worst = issues.reduce((m, i) => Math.max(m, SEVERITY_RANK[i.severity]), -1)

  return {
    summary: {
      status: worst >= 2 ? 'critical' : worst === 1 ? 'warning' : 'ok',
      maxVelocity: round(Math.max(0, ...pipes.map((p) => p._v)), 2),
      minPressure: consumers.length ? Math.min(...consumers.map((n) => n.pressure)) : null,
      maxPressure: consumers.length ? Math.max(...consumers.map((n) => n.pressure)) : null,
      totalHeadLoss: round(
        pipes.filter((p) => treePipes.has(p.id)).reduce((s, p) => s + p._hf, 0),
        2,
      ),
      issueCount: issues.filter((i) => i.severity !== 'info').length,
    },
    nodes,
    pipes: pipes.map(({ _hf, _v, ...rest }) => rest),
    issues: issues.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]),
  }
}

const label = (n) => n.name || n.id
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d
