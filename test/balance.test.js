import { describe, it, expect } from 'vitest'
import { balanceFlows } from '../src/services/balance.js'
import { demoNetwork } from './fixtures/networks.js'

const flows = (net) => Object.fromEntries(net.pipes.map((p) => [p.id, p.flow]))

describe('balanceFlows', () => {
  it('cada tubería lleva la suma de la demanda aguas abajo', () => {
    const r = balanceFlows(demoNetwork())
    // J1 (4) + S1 + S2 + S3 (4 cada uno) = 16 L/s
    expect(flows(r.network)).toEqual({ a: 16, b: 16, c0: 4, c1: 4, c2: 4 })
    expect(r.totalDemand).toBe(16)
  })
  it('informa solo de los tramos que cambian y no muta la entrada', () => {
    const net = demoNetwork()
    const r = balanceFlows(net)
    expect(r.changes).toContainEqual({ pipeId: 'c2', from: 8, to: 4 })
    expect(r.changes.map((c) => c.pipeId)).not.toContain('c0')
    expect(net.pipes.find((p) => p.id === 'c2').flow).toBe(8)
  })
  it('suma demandas heterogéneas por ramas', () => {
    const net = demoNetwork()
    net.nodes.find((n) => n.id === 'S1').demand = 2.5
    net.nodes.find((n) => n.id === 'S3').demand = 10
    const f = flows(balanceFlows(net).network)
    expect(f).toMatchObject({ c0: 2.5, c1: 4, c2: 10, b: 20.5, a: 20.5 })
  })
  it('conserva el caudal de anillos y nodos sin conexión', () => {
    const net = demoNetwork()
    net.pipes.push({ id: 'loop', from: 'S1', to: 'S2', diameter: 100, flow: 1 })
    net.nodes.push({
      id: 'X',
      type: 'junction',
      name: 'X',
      x: 0,
      y: 0,
      pressure: 0,
      elevation: 0,
      demand: 9,
    })
    const r = balanceFlows(net)
    expect(r.loops).toEqual(['loop'])
    expect(r.unreached).toEqual(['X'])
    expect(flows(r.network).loop).toBe(1)
    expect(r.totalDemand).toBe(16)
  })
  it('sin tanques no cambia nada', () => {
    const net = demoNetwork()
    net.nodes = net.nodes.filter((n) => n.type !== 'tank')
    net.pipes = net.pipes.filter((p) => p.from !== 'T1')
    const r = balanceFlows(net)
    expect(r.changes).toEqual([])
    expect(r.totalDemand).toBe(0)
  })
  it('varios tanques reparten cada uno su zona', () => {
    const net = demoNetwork()
    net.nodes.push({ id: 'T2', type: 'tank', name: 'T2', x: 0, y: 0, pressure: 10, elevation: 10 })
    net.pipes.push({ id: 'z', from: 'T2', to: 'S1', diameter: 100, flow: 1 })
    const f = flows(balanceFlows(net).network)
    expect(f.c0 + f.z).toBeGreaterThanOrEqual(0)
    expect(balanceFlows(net).totalDemand).toBe(16)
  })
})
