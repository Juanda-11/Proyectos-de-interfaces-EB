import { describe, it, expect } from 'vitest'
import { generateNetwork, parsePrompt, MAX_SECTORS } from '../src/services/generator.js'
import { networkSchema } from '../src/schemas/network.js'
import { simulate } from '../src/services/simulation.js'

describe('parsePrompt', () => {
  it('lee el número de sectores', () =>
    expect(parsePrompt('Diseñar red para 4 sectores').sectors).toBe(4))
  it('usa 3 sectores por defecto', () => expect(parsePrompt('hazme una red').sectors).toBe(3))
  it('limita el rango de sectores', () => {
    expect(parsePrompt('0 sectores').sectors).toBe(1)
    expect(parsePrompt('50 sectores').sectors).toBe(MAX_SECTORS)
  })
  it('lee la demanda por sector', () => {
    expect(parsePrompt('3 sectores de 6 L/s').demand).toBe(6)
    expect(parsePrompt('3 sectores con 2,5 l/s').demand).toBe(2.5)
  })
})

describe('generateNetwork', () => {
  it.each([1, 3, 5, MAX_SECTORS])('genera una red válida y estable con %i sectores', (n) => {
    const net = generateNetwork({ sectors: n, demand: 4 })
    expect(networkSchema.safeParse(net).success).toBe(true)
    expect(net.nodes).toHaveLength(n + 3)
    expect(net.pipes).toHaveLength(n + 2)
    const sim = simulate(net)
    expect(sim.issues.filter((i) => i.severity !== 'info')).toEqual([])
  })
  it('centra los sectores verticalmente', () => {
    const ys = generateNetwork({ sectors: 3 })
      .nodes.filter((n) => n.id.startsWith('S'))
      .map((n) => n.y)
    expect(ys).toEqual([180, 300, 420])
  })
})
