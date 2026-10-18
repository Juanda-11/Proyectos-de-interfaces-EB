import { describe, it, expect } from 'vitest'
import { networkSchema } from '../src/schemas/network.js'

const node = (id, type = 'junction', extra = {}) => ({ id, type, name: id, x: 0, y: 0, ...extra })
const pipe = (id, from, to, extra = {}) => ({ id, from, to, diameter: 100, flow: 4, ...extra })

describe('networkSchema', () => {
  it('acepta una red válida y aplica valores por defecto', () => {
    const r = networkSchema.safeParse({ nodes: [node('A'), node('B')], pipes: [pipe('p', 'A', 'B')] })
    expect(r.success).toBe(true)
    expect(r.data.nodes[0].pressure).toBe(0)
    expect(r.data.nodes[0].elevation).toBe(0)
  })
  it('rechaza ids de nodo duplicados', () => {
    const r = networkSchema.safeParse({ nodes: [node('A'), node('A')], pipes: [] })
    expect(r.success).toBe(false)
  })
  it('rechaza tuberías que apuntan a nodos inexistentes', () => {
    const r = networkSchema.safeParse({ nodes: [node('A')], pipes: [pipe('p', 'A', 'Z')] })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].message).toMatch(/Z/)
  })
  it('rechaza bucles de una tubería sobre un mismo nodo', () => {
    const r = networkSchema.safeParse({ nodes: [node('A')], pipes: [pipe('p', 'A', 'A')] })
    expect(r.success).toBe(false)
  })
  it('rechaza diámetros fuera de rango y tipos desconocidos', () => {
    expect(networkSchema.safeParse({ nodes: [node('A'), node('B')], pipes: [pipe('p', 'A', 'B', { diameter: 1 })] }).success).toBe(false)
    expect(networkSchema.safeParse({ nodes: [node('A', 'reactor')], pipes: [] }).success).toBe(false)
  })
})
