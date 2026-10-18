import { describe, it, expect } from 'vitest'
import { toEpanet } from '../src/services/epanet.js'
import { demoNetwork } from './fixtures/networks.js'

const section = (text, name) => {
  const m = text.match(new RegExp(`\\[${name}\\]\\n([\\s\\S]*?)(?=\\n\\[|$)`))
  return m ? m[1].split('\n').filter((l) => l && !l.startsWith(';')) : []
}

describe('toEpanet', () => {
  const inp = toEpanet(demoNetwork())

  it('incluye todas las secciones y termina en [END]', () => {
    for (const s of [
      'TITLE',
      'JUNCTIONS',
      'RESERVOIRS',
      'PIPES',
      'PUMPS',
      'CURVES',
      'COORDINATES',
      'OPTIONS',
    ]) {
      expect(inp).toContain(`[${s}]`)
    }
    expect(inp.trim().endsWith('[END]')).toBe(true)
  })
  it('exporta el tanque como embalse con altura = cota + nivel', () => {
    expect(section(inp, 'RESERVOIRS')).toEqual(['T1\t30'])
  })
  it('divide la bomba en nodos de entrada y salida unidos por un enlace', () => {
    expect(section(inp, 'PUMPS')).toEqual(['P1\tP1_in\tP1_out\tHEAD\tC_P1'])
    expect(section(inp, 'CURVES')).toEqual(['C_P1\t12\t30'])
    const junctions = section(inp, 'JUNCTIONS').map((l) => l.split('\t')[0])
    expect(junctions).toEqual(expect.arrayContaining(['P1_in', 'P1_out', 'J1', 'S1']))
  })
  it('reconecta las tuberías a los extremos correctos de la bomba', () => {
    const pipes = section(inp, 'PIPES').map((l) => l.split('\t'))
    expect(pipes.find((p) => p[0] === 'a').slice(1, 3)).toEqual(['T1', 'P1_in'])
    expect(pipes.find((p) => p[0] === 'b').slice(1, 3)).toEqual(['P1_out', 'J1'])
  })
  it('usa longitud calculada, diámetro y rugosidad', () => {
    const c2 = section(inp, 'PIPES')
      .find((l) => l.startsWith('c2'))
      .split('\t')
    expect(Number(c2[3])).toBeCloseTo(125.3, 1)
    expect(c2.slice(4)).toEqual(['50', '130', '0', 'Open'])
  })
  it('exporta demandas de nodos de consumo', () => {
    expect(section(inp, 'JUNCTIONS')).toContain('S1\t0\t4')
  })
  it('exporta válvulas como TCV con el diámetro de la tubería', () => {
    const net = demoNetwork()
    net.nodes.find((n) => n.id === 'J1').type = 'valve'
    const valves = section(toEpanet(net), 'VALVES')
    expect(valves).toEqual(['J1\tJ1_in\tJ1_out\t150\tTCV\t2.5\t0'])
  })
  it('sanea identificadores y evita colisiones', () => {
    const net = demoNetwork()
    net.nodes[2].id = 'Nodo 1'
    net.nodes[3].id = 'Nodo_1'
    net.pipes[1].to = 'Nodo 1'
    net.pipes[2].from = 'Nodo 1'
    net.pipes[3].from = 'Nodo 1'
    net.pipes[4].from = 'Nodo 1'
    net.pipes[2].to = 'Nodo_1'
    const out = toEpanet(net)
    expect(out).not.toMatch(/Nodo 1/)
    const ids = section(out, 'JUNCTIONS').map((l) => l.split('\t')[0])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
