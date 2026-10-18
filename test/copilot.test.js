import { describe, it, expect, vi } from 'vitest'
import { classifyIntent, design, audit, auditSummary } from '../src/services/copilot.js'
import { simulate } from '../src/services/simulation.js'
import { demoNetwork } from './fixtures/networks.js'

const fakeAI = (reply) => ({
  complete: vi
    .fn()
    .mockImplementation(async () => (reply instanceof Error ? Promise.reject(reply) : reply)),
})

describe('classifyIntent', () => {
  it.each([
    ['Auditar presiones de la red', 'audit'],
    ['revisa si hay fugas', 'audit'],
    ['Diseñar red para 3 sectores', 'design'],
    ['genera un barrio', 'design'],
    ['hola', 'help'],
  ])('%s -> %s', (p, i) => expect(classifyIntent(p)).toBe(i))
})

describe('design', () => {
  it('sin IA usa el motor por reglas', async () => {
    const r = await design('Diseñar red para 4 sectores')
    expect(r.source).toBe('rules')
    expect(r.network.nodes).toHaveLength(7)
    expect(r.simulation.summary.status).toBe('ok')
  })
  it('con IA aplica los parámetros devueltos (aunque vengan con texto alrededor)', async () => {
    const ai = fakeAI(
      'Claro: {"sectors": 5, "demandPerSector": 6, "explanation": "Barrio de 5 manzanas."}',
    )
    const r = await design('un barrio con cinco manzanas', { ai })
    expect(r.source).toBe('ai')
    expect(r.network.nodes).toHaveLength(8)
    expect(r.message).toContain('Barrio de 5 manzanas.')
  })
  it.each([
    ['JSON inválido', 'no sé'],
    ['fuera de rango', '{"sectors": 99, "demandPerSector": 4}'],
    ['error de red', new Error('boom')],
  ])('recurre a reglas si la IA falla (%s)', async (_n, reply) => {
    const r = await design('red para 2 sectores', { ai: fakeAI(reply) })
    expect(r.source).toBe('rules')
    expect(r.network.nodes).toHaveLength(5)
  })
})

describe('audit', () => {
  it('describe los problemas encontrados', async () => {
    const r = await audit(demoNetwork())
    expect(r.source).toBe('rules')
    expect(r.message).toMatch(/1 problema/)
    expect(r.message).toMatch(/DN75/)
  })
  it('informa una red estable', async () => {
    const net = demoNetwork()
    net.pipes[4].diameter = 75
    expect((await audit(net)).message).toMatch(/estable/)
  })
  it('usa la explicación de la IA si hay problemas y solo entonces', async () => {
    const ai = fakeAI(' Cambia el tramo J1→S3. ')
    expect((await audit(demoNetwork(), { ai })).message).toBe('Cambia el tramo J1→S3.')
    const ok = demoNetwork()
    ok.pipes[4].diameter = 75
    await audit(ok, { ai })
    expect(ai.complete).toHaveBeenCalledTimes(1)
  })
  it('mantiene el resumen por reglas si la IA falla', async () => {
    const r = await audit(demoNetwork(), { ai: fakeAI(new Error('x')) })
    expect(r.source).toBe('rules')
  })
})

describe('auditSummary', () => {
  it('abrevia cuando hay más de 3 problemas', () => {
    const sim = simulate(demoNetwork())
    const issues = Array.from({ length: 5 }, (_, i) => ({ severity: 'warning', message: `m${i}.` }))
    expect(auditSummary({ ...sim, issues })).toContain('(y 2 más)')
  })
})
