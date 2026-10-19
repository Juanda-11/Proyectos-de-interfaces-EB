import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/create-app.js'
import { loadConfig } from '../src/config.js'
import { classifyIntent } from '../src/services/copilot.js'
import { demoNetwork } from './fixtures/networks.js'

const makeApp = (deps) => createApp({ config: loadConfig({ NODE_ENV: 'test' }), ...deps })
const en = (req) => req.set('Accept-Language', 'en-US,en;q=0.9')

describe('idioma de las respuestas', () => {
  it('simulate: los problemas salen en inglés o español según Accept-Language', async () => {
    const app = makeApp()
    const es = await request(app).post('/api/simulate').send(demoNetwork())
    expect(es.body.issues[0].message).toMatch(/El tramo .* circula a/)
    expect(es.body.issues[0].suggestion).toBe('Usa DN75.')
    const r = await en(request(app).post('/api/simulate')).send(demoNetwork())
    expect(r.body.issues[0].message).toMatch(
      /Pipe .* flows at .* m\/s \(recommended max\. 2\.5 m\/s\)\./,
    )
    expect(r.body.issues[0].suggestion).toBe('Use DN75.')
  })

  it('copilot: diseña con nombres y mensajes en inglés', async () => {
    const r = await en(request(makeApp()).post('/api/copilot')).send({
      prompt: 'Design a network for 2 sectors',
    })
    expect(r.body.intent).toBe('design')
    expect(r.body.network.nodes.map((n) => n.name)).toEqual([
      'Tank T1',
      'Pump B1',
      'Node J1',
      'Sector 1',
      'Sector 2',
    ])
    expect(r.body.message).toMatch(/Network generated: 1 tank, 1 pump and 2 sectors/)
    expect(r.body.message).toContain('Press "Simulate flow"')
  })

  it('copilot: audita y ayuda en inglés', async () => {
    const app = makeApp()
    const audit = await en(request(app).post('/api/copilot')).send({
      prompt: 'Audit pressures',
      network: demoNetwork(),
    })
    expect(audit.body.message).toMatch(/^I found 1 problem\(s\)/)
    const noNet = await en(request(app).post('/api/copilot')).send({ prompt: 'check pressure' })
    expect(noNet.body.message).toMatch(/I need the current network/)
    const help = await en(request(app).post('/api/copilot')).send({ prompt: 'hello' })
    expect(help.body.message).toMatch(/I can design networks/)
  })

  it('optimize y balance responden en inglés', async () => {
    const app = makeApp()
    const o = await en(request(app).post('/api/optimize')).send(demoNetwork())
    expect(o.body.message).toMatch(
      /^Applied 1 change\(s\) — diameters: c2 \(DN50→DN75\)\. The network is now stable\.$/,
    )
    const b = await en(request(app).post('/api/balance')).send(demoNetwork())
    expect(b.body.message).toMatch(/^Flows recalculated on/)
  })

  it('los errores HTTP también se traducen', async () => {
    const app = makeApp()
    const nf = await en(request(app).get('/api/nada'))
    expect(nf.body.error.message).toBe('Route not found: GET /api/nada')
    const bad = await en(request(app).post('/api/simulate')).send({})
    expect(bad.body.error.message).toBe('Invalid input data')
    const es = await request(app).post('/api/simulate').send({})
    expect(es.body.error.message).toBe('Datos de entrada inválidos')
    const json = await en(
      request(app).post('/api/simulate').set('content-type', 'application/json'),
    ).send('{x')
    expect(json.body.error.message).toBe('The request body is not valid JSON')
  })

  it('el prompt de la IA pide responder en el idioma de la petición', async () => {
    const ai = {
      complete: vi.fn().mockResolvedValue('{"sectors":2,"demandPerSector":3,"explanation":"ok"}'),
    }
    const app = makeApp({ ai })
    await en(request(app).post('/api/copilot')).send({ prompt: 'a small neighborhood' })
    expect(ai.complete.mock.calls[0][0].system).toContain('English')
    await request(app).post('/api/copilot').send({ prompt: 'un barrio pequeño' })
    expect(ai.complete.mock.calls[1][0].system).toContain('español')
  })
})

describe('classifyIntent en inglés', () => {
  it.each([
    ['Audit the pressures', 'audit'],
    ['check for leaks', 'audit'],
    ['review the network', 'audit'],
    ['Design a network for 3 sectors', 'design'],
    ['build a small neighborhood', 'design'],
    ['hello there', 'help'],
  ])('%s -> %s', (p, i) => expect(classifyIntent(p)).toBe(i))
})
