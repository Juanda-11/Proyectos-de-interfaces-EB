import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/create-app.js'
import { loadConfig } from '../src/config.js'
import { createMemoryUserStore } from '../src/services/auth/store.js'
import { demoNetwork } from './fixtures/networks.js'

const SECRET = 's'.repeat(40)
const makeApp = (env = {}, deps = {}) =>
  createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      AUTH_SECRET: SECRET,
      CORS_ORIGINS: 'https://app.example',
      ...env,
    }),
    ...deps,
  })
const body = { name: 'Ana Pérez', email: 'ana@example.com', password: 'Clave-segura-1' }
const register = (app, extra = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({ ...body, ...extra })
const login = (app, email = body.email, password = body.password) =>
  request(app).post('/api/auth/login').send({ email, password })
const bearer = (token) => ({ Authorization: `Bearer ${token}` })

describe('registro', () => {
  it('crea la cuenta, devuelve token y usuario público (sin hash)', async () => {
    const res = await register(makeApp())
    expect(res.status).toBe(201)
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: 'ana@example.com',
      name: 'Ana Pérez',
    })
    expect(res.body.token.split('.')).toHaveLength(3)
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|scrypt/)
  })
  it('normaliza el correo y rechaza duplicados con 409', async () => {
    const app = makeApp()
    await register(app)
    const dup = await register(app, { email: ' ANA@Example.COM ' })
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe('EMAIL_TAKEN')
  })
  it.each([
    ['contraseña corta', { password: '1234567' }],
    ['correo inválido', { email: 'no-es-correo' }],
    ['nombre vacío', { name: ' ' }],
    ['contraseña enorme', { password: 'x'.repeat(129) }],
  ])('valida los datos: %s', async (_n, extra) => {
    const res = await register(makeApp(), extra)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
  it('no permite registrar el correo de la cuenta demo', async () => {
    expect((await register(makeApp(), { email: 'demo@hydrograph.ai' })).status).toBe(409)
  })
  it('está deshabilitado en producción sin almacenamiento persistente', async () => {
    const app = makeApp({ NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example' })
    const res = await register(app)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('REGISTRATION_DISABLED')
  })
  it('se habilita en producción con almacenamiento persistente o con AUTH_REGISTRATION=on', async () => {
    const persistent = { ...createMemoryUserStore(), persistent: true }
    expect(
      (await register(makeApp({ NODE_ENV: 'production' }, { userStore: persistent }))).status,
    ).toBe(201)
    expect(
      (await register(makeApp({ NODE_ENV: 'production', AUTH_REGISTRATION: 'on' }))).status,
    ).toBe(201)
    expect((await register(makeApp({ AUTH_REGISTRATION: 'off' }))).status).toBe(403)
  })
})

describe('inicio de sesión', () => {
  it('acepta las credenciales correctas (sin distinguir mayúsculas en el correo)', async () => {
    const app = makeApp()
    await register(app)
    const res = await login(app, 'ANA@example.com')
    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe('Ana Pérez')
    expect(res.body.token).toBeTruthy()
  })
  it('rechaza contraseña incorrecta y usuario inexistente con el mismo mensaje', async () => {
    const app = makeApp()
    await register(app)
    const wrong = await login(app, body.email, 'otra-clave-123')
    const missing = await login(app, 'nadie@example.com')
    expect(wrong.status).toBe(401)
    expect(missing.status).toBe(401)
    expect(wrong.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: missing.body.error.message,
    })
  })
  it('permite entrar con la cuenta de demostración', async () => {
    const res = await login(makeApp(), 'demo@hydrograph.ai', 'Hydro2026!')
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ id: 'demo', email: 'demo@hydrograph.ai' })
    expect((await login(makeApp(), 'demo@hydrograph.ai', 'incorrecta')).status).toBe(401)
  })
  it('la cuenta demo se puede desactivar o cambiar por variables de entorno', async () => {
    expect(
      (await login(makeApp({ DEMO_ENABLED: 'false' }), 'demo@hydrograph.ai', 'Hydro2026!')).status,
    ).toBe(401)
    const custom = makeApp({ DEMO_EMAIL: 'profe@uni.edu', DEMO_PASSWORD: 'Otra-clave-9' })
    expect((await login(custom, 'profe@uni.edu', 'Otra-clave-9')).status).toBe(200)
  })
  it('valida el cuerpo y responde en inglés si se pide', async () => {
    const app = makeApp()
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400)
    const res = await login(app, 'nadie@example.com').set('Accept-Language', 'en')
    expect(res.body.error.message).toBe('Incorrect email or password')
  })
})

describe('rutas protegidas', () => {
  it.each([
    ['post', '/api/simulate'],
    ['post', '/api/balance'],
    ['post', '/api/optimize'],
    ['post', '/api/export/epanet'],
    ['post', '/api/copilot'],
    ['get', '/api/auth/me'],
  ])('%s %s exige sesión', async (method, path) => {
    const res = await request(makeApp())[method](path).send(demoNetwork())
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })
  it('con token válido permite usarlas y /me devuelve al usuario', async () => {
    const app = makeApp()
    const { token } = (await register(app)).body
    const sim = await request(app).post('/api/simulate').set(bearer(token)).send(demoNetwork())
    expect(sim.status).toBe(200)
    const me = await request(app).get('/api/auth/me').set(bearer(token))
    expect(me.body.user).toMatchObject({ email: 'ana@example.com', name: 'Ana Pérez' })
  })
  it.each([
    ['sin esquema Bearer', (t) => ({ Authorization: t })],
    ['token manipulado', (t) => bearer(`${t}x`)],
    ['token vacío', () => bearer('')],
  ])('rechaza %s', async (_n, headers) => {
    const app = makeApp()
    const { token } = (await register(app)).body
    const res = await request(app).get('/api/auth/me').set(headers(token))
    expect(res.status).toBe(401)
  })
  it('un token firmado con otro secreto no sirve', async () => {
    const { token } = (await register(makeApp({ AUTH_SECRET: 'x'.repeat(40) }))).body
    expect((await request(makeApp()).get('/api/auth/me').set(bearer(token))).status).toBe(401)
  })
  it('health e índice siguen siendo públicos', async () => {
    const app = makeApp()
    expect((await request(app).get('/api/health')).status).toBe(200)
    expect((await request(app).get('/api')).status).toBe(200)
  })
  it('con AUTH_ENABLED=false la API queda abierta', async () => {
    const app = makeApp({ AUTH_ENABLED: 'false' })
    expect((await request(app).post('/api/simulate').send(demoNetwork())).status).toBe(200)
  })
  it('responde 503 si en producción falta AUTH_SECRET', async () => {
    const app = createApp({
      config: loadConfig({ NODE_ENV: 'production', CORS_ORIGINS: 'https://a.example' }),
    })
    const sim = await request(app).post('/api/simulate').send(demoNetwork())
    expect(sim.status).toBe(503)
    expect(sim.body.error.code).toBe('AUTH_NOT_CONFIGURED')
    expect((await login(app, 'demo@hydrograph.ai', 'Hydro2026!')).status).toBe(503)
    const health = await request(app).get('/api/health')
    expect(health.body.auth).toMatchObject({ enabled: true, configured: false })
  })
})

describe('/api/health · auth', () => {
  it('informa el estado de la autenticación, el registro y la cuenta demo', async () => {
    const { body: h } = await request(makeApp()).get('/api/health')
    expect(h.auth).toEqual({
      enabled: true,
      configured: true,
      registration: true,
      demo: { email: 'demo@hydrograph.ai', password: 'Hydro2026!' },
    })
  })
  it('oculta la cuenta demo con DEMO_HINT=false o DEMO_ENABLED=false y el registro en producción', async () => {
    expect(
      (await request(makeApp({ DEMO_HINT: 'false' })).get('/api/health')).body.auth.demo,
    ).toBeNull()
    expect(
      (await request(makeApp({ DEMO_ENABLED: 'false' })).get('/api/health')).body.auth.demo,
    ).toBeNull()
    const prod = await request(makeApp({ NODE_ENV: 'production' })).get('/api/health')
    expect(prod.body.auth.registration).toBe(false)
  })
})

describe('límite de intentos', () => {
  it('bloquea con 429 tras demasiados intentos de inicio de sesión (fuera de pruebas)', async () => {
    const app = makeApp({ NODE_ENV: 'development' })
    let last
    for (let i = 0; i < 31; i++) last = await login(app, 'nadie@example.com', 'mala-clave-1')
    expect(last.status).toBe(429)
    expect(last.body.error.code).toBe('TOO_MANY_ATTEMPTS')
  })
})

describe('almacenamiento inyectado', () => {
  it('usa el almacén indicado y propaga sus errores como 500 sin filtrar detalles', async () => {
    const userStore = {
      persistent: true,
      getByEmail: vi.fn().mockRejectedValue(new Error('redis caído: secreto-interno')),
      create: vi.fn(),
    }
    const res = await login(makeApp({}, { userStore }))
    expect(res.status).toBe(500)
    expect(JSON.stringify(res.body)).not.toMatch(/secreto-interno/)
  })
})
