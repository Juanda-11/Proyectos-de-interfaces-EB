import { describe, it, expect } from 'vitest'
import { fixDiameters, fixPumpHead, optimize } from '../src/services/optimizer.js'
import { simulate } from '../src/services/simulation.js'
import { demoNetwork } from './fixtures/networks.js'

describe('fixDiameters', () => {
  it('ajusta solo los tramos con velocidad excesiva', () => {
    const net = demoNetwork()
    const { network, changes } = fixDiameters(net)
    expect(changes).toEqual([{ type: 'diameter', elementId: 'c2', from: 50, to: 75 }])
    expect(network.pipes.find((p) => p.id === 'c2').diameter).toBe(75)
  })
  it('no muta la red original', () => {
    const net = demoNetwork()
    fixDiameters(net)
    expect(net.pipes.find((p) => p.id === 'c2').diameter).toBe(50)
  })
})

describe('fixPumpHead', () => {
  it('sube la altura de la bomba hasta cumplir la presión mínima', () => {
    const net = demoNetwork()
    net.nodes.find((n) => n.id === 'P1').pressure = 0
    net.nodes.find((n) => n.id === 'S1').elevation = 20
    const { network, changes } = fixPumpHead(net)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ type: 'pumpHead', elementId: 'P1', from: 0 })
    expect(simulate(network).issues.some((i) => i.code === 'LOW_PRESSURE')).toBe(false)
  })
  it('no toca la red si ya cumple o si no hay bombas', () => {
    expect(fixPumpHead(demoNetwork()).changes).toEqual([])
    const net = demoNetwork()
    net.nodes = net.nodes.filter((n) => n.type !== 'pump')
    expect(fixPumpHead(net).changes).toEqual([])
  })
  it('descarta el cambio si provoca sobrepresión', () => {
    const net = demoNetwork()
    net.nodes.find((n) => n.id === 'P1').pressure = 0
    net.nodes.find((n) => n.id === 'S1').elevation = 70 // exige > 80 m: se pasa en el resto de nodos
    expect(fixPumpHead(net).changes).toEqual([])
  })
})

describe('optimize', () => {
  it('deja estable la red demo', () => {
    const r = optimize(demoNetwork())
    expect(r.changes).toHaveLength(1)
    expect(r.simulation.summary.status).toBe('ok')
    expect(r.message).toMatch(/DN50→DN75/)
    expect(r.message).toMatch(/estable/)
  })
  it('informa cuando no hay nada que hacer', () => {
    const first = optimize(demoNetwork())
    expect(optimize(first.network).message).toMatch(/nada que optimizar/)
  })
})
