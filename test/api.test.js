import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { demoNetwork } from './fixtures/networks.js'

const makeApp = (env = {}, deps = {}) =>
  createApp({
    config: loadConfig({ NODE_ENV: 'test', CORS_ORIGINS: 'https://app.example', ...env }),
    ...deps,
  })

describe('GET /api/health', () => {
  it('responde ok e indica el motor activo', async () => {
    const res = await request(makeApp()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', ai: 'rules' })
  })
  it('añade cabeceras de seguridad y un id de petición', async () => {
    const res = await request(makeApp()).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-request-id']).toBeTruthy()
  })
  it('refleja el modelo configurado', async () => {
    const res = await request(makeApp({ ANTHROPIC_API_KEY: 'k', ANTHROPIC_MODEL: 'm1' })).get(
      '/api/health',
    )
    expect(res.body.ai).toBe('m1')
  })
})

describe('CORS', () => {
  it('permite solo los orígenes configurados', async () => {
    const app = makeApp()
    const ok = await request(app).get('/api/health').set('Origin', 'https://app.example')
    expect(ok.headers['access-control-allow-origin']).toBe('https://app.example')
    const bad = await request(app).get('/api/health').set('Origin', 'https://evil.example')
    expect(bad.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('POST /api/simulate', () => {
  it('simula la red demo', async () => {
    const res = await request(makeApp()).post('/api/simulate').send(demoNetwork())
    expect(res.status).toBe(200)
    expect(res.body.summary.status).toBe('warning')
    expect(res.body.issues[0]).toMatchObject({ code: 'HIGH_VELOCITY', elementId: 'c2' })
  })
  it('responde 400 con detalle si la red es inválida', async () => {
    const net = demoNetwork()
    net.pipes[0].to = 'ZZ'
    const res = await request(makeApp()).post('/api/simulate').send(net)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details[0].message).toMatch(/ZZ/)
  })
  it('responde 400 si el JSON está mal formado', async () => {
    const res = await request(makeApp())
      .post('/api/simulate')
      .set('content-type', 'application/json')
      .send('{oops')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })
  it('responde 413 si el cuerpo es demasiado grande', async () => {
    const res = await request(makeApp())
      .post('/api/simulate')
      .send({ blob: 'x'.repeat(300_000) })
    expect(res.status).toBe(413)
  })
})

describe('POST /api/copilot', () => {
  it('diseña una red', async () => {
    const res = await request(makeApp())
      .post('/api/copilot')
      .send({ prompt: 'Diseñar red para 4 sectores' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ intent: 'design', source: 'rules' })
    expect(res.body.network.nodes).toHaveLength(7)
  })
  it('audita la red enviada', async () => {
    const res = await request(makeApp())
      .post('/api/copilot')
      .send({ prompt: 'Auditar presiones', network: demoNetwork() })
    expect(res.body.intent).toBe('audit')
    expect(res.body.simulation.issues).toHaveLength(1)
  })
  it('pide la red si se quiere auditar sin enviarla', async () => {
    const res = await request(makeApp()).post('/api/copilot').send({ prompt: 'Auditar presiones' })
    expect(res.body.intent).toBe('help')
    expect(res.body.message).toMatch(/red actual/)
  })
  it('muestra ayuda ante órdenes desconocidas', async () => {
    const res = await request(makeApp()).post('/api/copilot').send({ prompt: 'hola' })
    expect(res.body.intent).toBe('help')
  })
  it('rechaza órdenes vacías o demasiado largas', async () => {
    const app = makeApp()
    expect((await request(app).post('/api/copilot').send({ prompt: '   ' })).status).toBe(400)
    expect(
      (
        await request(app)
          .post('/api/copilot')
          .send({ prompt: 'a'.repeat(501) })
      ).status,
    ).toBe(400)
  })
  it('usa la IA inyectada y recurre a reglas si falla', async () => {
    const ai = {
      complete: vi
        .fn()
        .mockResolvedValueOnce('{"sectors":2,"demandPerSector":3,"explanation":"ok"}')
        .mockRejectedValueOnce(new Error('x')),
    }
    const app = makeApp({}, { ai })
    const a = await request(app).post('/api/copilot').send({ prompt: 'un barrio pequeño' })
    expect(a.body).toMatchObject({ source: 'ai' })
    expect(a.body.network.nodes).toHaveLength(5)
    const b = await request(app).post('/api/copilot').send({ prompt: 'red para 3 sectores' })
    expect(b.body.source).toBe('rules')
  })
})

describe('errores generales', () => {
  it('404 con formato de error uniforme', async () => {
    const res = await request(makeApp()).get('/api/nada')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' })
    expect(res.body.error.requestId).toBe(res.headers['x-request-id'])
  })
  it('limita las peticiones por minuto', async () => {
    const app = makeApp({ RATE_LIMIT_MAX: '2' })
    const codes = []
    for (let i = 0; i < 3; i++) codes.push((await request(app).get('/api/health')).status)
    expect(codes).toEqual([200, 200, 429])
  })
})

describe('X-Request-Id', () => {
  it('reutiliza un id válido y descarta uno sospechoso', async () => {
    const app = makeApp()
    expect(
      (await request(app).get('/api/health').set('x-request-id', 'abc-123')).headers[
        'x-request-id'
      ],
    ).toBe('abc-123')
    const bad = await request(app).get('/api/health').set('x-request-id', 'a b<script>')
    expect(bad.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('POST /api/optimize', () => {
  it('corrige la red demo y devuelve los cambios', async () => {
    const res = await request(makeApp()).post('/api/optimize').send(demoNetwork())
    expect(res.status).toBe(200)
    expect(res.body.changes).toEqual([{ type: 'diameter', elementId: 'c2', from: 50, to: 75 }])
    expect(res.body.simulation.summary.status).toBe('ok')
  })
  it('valida la entrada', async () => {
    expect((await request(makeApp()).post('/api/optimize').send({})).status).toBe(400)
  })
})
