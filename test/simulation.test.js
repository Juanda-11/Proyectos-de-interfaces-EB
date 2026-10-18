import { describe, it, expect } from 'vitest'
import { simulate } from '../src/services/simulation.js'
import { demoNetwork } from './fixtures/networks.js'

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))

describe('simulate', () => {
  it('detecta la tubería subdimensionada de la red demo', () => {
    const r = simulate(demoNetwork())
    const codes = r.issues.map((i) => `${i.code}:${i.elementId}`)
    expect(codes).toEqual(['HIGH_VELOCITY:c2'])
    expect(r.summary.status).toBe('warning')
    expect(byId(r.pipes).c2.status).toBe('warn')
    expect(byId(r.pipes).c2.suggestedDiameter).toBe(75)
  })

  it('la presión cae por fricción aguas abajo y la bomba la eleva', () => {
    const n = byId(simulate(demoNetwork()).nodes)
    expect(n.T1.head).toBe(30)
    expect(n.P1.head).toBeGreaterThan(n.T1.head + 29)
    expect(n.S1.pressure).toBeLessThan(n.J1.pressure)
    expect(n.S3.pressure).toBeLessThan(n.S1.pressure - 30) // el tramo estrecho pierde mucha carga
  })

  it('aplicar el diámetro sugerido elimina la alerta', () => {
    const net = demoNetwork()
    net.pipes.find((p) => p.id === 'c2').diameter = 75
    const r = simulate(net)
    expect(r.issues).toEqual([])
    expect(r.summary.status).toBe('ok')
  })

  it('marca nodos desconectados', () => {
    const net = demoNetwork()
    net.nodes.push({ id: 'X', type: 'junction', name: 'Huérfano', x: 0, y: 0, pressure: 0, elevation: 0 })
    const r = simulate(net)
    expect(byId(r.nodes).X).toMatchObject({ status: 'disconnected', pressure: null })
    expect(r.issues.some((i) => i.code === 'DISCONNECTED' && i.elementId === 'X')).toBe(true)
  })

  it('exige al menos un tanque', () => {
    const net = demoNetwork()
    net.nodes = net.nodes.filter((n) => n.type !== 'tank')
    net.pipes = net.pipes.filter((p) => p.from !== 'T1')
    const r = simulate(net)
    expect(r.issues[0]).toMatchObject({ severity: 'critical', code: 'NO_SOURCE' })
    expect(r.summary.status).toBe('critical')
    expect(r.summary.minPressure).toBeNull()
  })

  it('detecta presión baja y negativa', () => {
    const net = demoNetwork()
    net.nodes.find((n) => n.id === 'P1').pressure = 0 // sin bomba
    net.nodes.find((n) => n.id === 'S1').elevation = 25 // sector elevado
    const r = simulate(net)
    const codes = r.issues.map((i) => i.code)
    expect(codes).toContain('LOW_PRESSURE')
    expect(r.nodes.find((n) => n.id === 'S1').pressure).toBeLessThan(10)
  })

  it('detecta sobrepresión', () => {
    const net = demoNetwork()
    net.nodes.find((n) => n.id === 'P1').pressure = 80
    const r = simulate(net)
    expect(r.issues.some((i) => i.code === 'HIGH_PRESSURE')).toBe(true)
  })

  it('las válvulas añaden pérdida local', () => {
    const base = demoNetwork()
    const withValve = demoNetwork()
    withValve.nodes.find((n) => n.id === 'J1').type = 'valve'
    const a = byId(simulate(base).nodes).J1.pressure
    const b = byId(simulate(withValve).nodes).J1.pressure
    expect(b).toBeLessThan(a)
  })

  it('no altera las presiones con tuberías que cierran un anillo', () => {
    const net = demoNetwork()
    net.pipes.push({ id: 'loop', from: 'S1', to: 'S2', diameter: 100, flow: 1 })
    const r = simulate(net)
    expect(r.pipes).toHaveLength(6)
    expect(byId(r.nodes).S2.pressure).toBe(byId(simulate(demoNetwork()).nodes).S2.pressure)
  })

  it('usa la longitud explícita de la tubería si se indica', () => {
    const net = demoNetwork()
    net.pipes[0].length = 1000
    expect(byId(simulate(net).pipes).a.length).toBe(1000)
  })
})
