import { describe, it, expect, vi } from 'vitest'
import {
  createMemoryUserStore,
  createUpstashUserStore,
  normalizeEmail,
} from '../src/services/auth/store.js'

const user = { id: 'u1', email: 'Ana@Example.com', name: 'Ana', passwordHash: 'h' }

describe('normalizeEmail', () => {
  it('recorta espacios y pasa a minúsculas', () =>
    expect(normalizeEmail('  Ana@X.COM ')).toBe('ana@x.com'))
})

describe('createMemoryUserStore', () => {
  it('crea y recupera usuarios sin distinguir mayúsculas', async () => {
    const store = createMemoryUserStore()
    expect(store.persistent).toBe(false)
    expect(await store.getByEmail('ana@example.com')).toBeNull()
    expect(await store.create(user)).toBe(true)
    expect(await store.getByEmail('ANA@example.com')).toMatchObject({
      id: 'u1',
      email: 'ana@example.com',
    })
  })
  it('rechaza correos repetidos', async () => {
    const store = createMemoryUserStore()
    await store.create(user)
    expect(await store.create({ ...user, id: 'u2', email: 'ana@EXAMPLE.com' })).toBe(false)
  })
})

describe('createUpstashUserStore', () => {
  const reply = (result, init = {}) => ({
    ok: true,
    status: 200,
    json: async () => ({ result }),
    ...init,
  })
  const make = (fetchImpl) =>
    createUpstashUserStore({ url: 'https://redis.example', token: 't0k', fetchImpl })

  it('envía comandos con el token en Authorization', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply(null))
    const store = make(fetchImpl)
    expect(store.persistent).toBe(true)
    expect(await store.getByEmail('Ana@Example.com')).toBeNull()
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://redis.example')
    expect(init.headers.Authorization).toBe('Bearer t0k')
    expect(JSON.parse(init.body)).toEqual(['GET', 'hydrograph:user:ana@example.com'])
  })
  it('devuelve el usuario guardado', async () => {
    const stored = { id: 'u1', email: 'ana@example.com', name: 'Ana' }
    const store = make(vi.fn().mockResolvedValue(reply(JSON.stringify(stored))))
    expect(await store.getByEmail('ana@example.com')).toEqual(stored)
  })
  it('crea con SET NX y detecta duplicados', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(reply('OK')).mockResolvedValueOnce(reply(null))
    const store = make(fetchImpl)
    expect(await store.create(user)).toBe(true)
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(sent.slice(0, 2)).toEqual(['SET', 'hydrograph:user:ana@example.com'])
    expect(sent[3]).toBe('NX')
    expect(JSON.parse(sent[2]).email).toBe('ana@example.com')
    expect(await store.create(user)).toBe(false)
  })
  it('propaga errores de la API y de red', async () => {
    const err = make(
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'WRONGPASS' }) }),
    )
    await expect(err.getByEmail('a@b.c')).rejects.toThrow(/WRONGPASS/)
    const down = make(vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    await expect(down.create(user)).rejects.toThrow(/ECONNRESET/)
    const html = make(
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 502,
          json: async () => Promise.reject(new Error('x')),
        }),
    )
    await expect(html.getByEmail('a@b.c')).rejects.toThrow(/502/)
  })
})
