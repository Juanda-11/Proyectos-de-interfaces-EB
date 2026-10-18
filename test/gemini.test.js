import { describe, it, expect, vi } from 'vitest'
import { createGeminiClient } from '../src/services/ai/gemini.js'
import { createAiClient } from '../src/services/ai/index.js'
import { AIError } from '../src/services/ai/errors.js'

const ok = (parts) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts } }] }),
})
const make = (fetchImpl) => createGeminiClient({ apiKey: 'k', model: 'gemini-x', fetchImpl })

describe('createGeminiClient', () => {
  it('llama a generateContent con la clave en la cabecera, no en la URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok([{ text: ' hola ' }]))
    expect(await make(fetchImpl).complete({ system: 's', user: 'u', maxTokens: 50 })).toBe('hola')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent',
    )
    expect(url).not.toContain('k=')
    expect(init.headers['x-goog-api-key']).toBe('k')
    expect(JSON.parse(init.body)).toMatchObject({
      systemInstruction: { parts: [{ text: 's' }] },
      contents: [{ role: 'user', parts: [{ text: 'u' }] }],
      generationConfig: { maxOutputTokens: 50 },
    })
  })
  it('omite systemInstruction si no hay sistema y concatena partes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok([{ text: 'a' }, {}, { text: 'b' }]))
    expect(await make(fetchImpl).complete({ user: 'u' })).toBe('ab')
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty('systemInstruction')
  })
  it('explica el límite gratuito en 429 y falla con otros estados', async () => {
    const e429 = make(vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(e429.complete({ user: 'u' })).rejects.toThrow(/límite gratuito/)
    const e500 = make(vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(e500.complete({ user: 'u' })).rejects.toThrow(AIError)
  })
  it('falla ante red caída, timeout o respuesta vacía (p. ej. bloqueada por seguridad)', async () => {
    await expect(
      make(vi.fn().mockRejectedValue(new Error('x'))).complete({ user: 'u' }),
    ).rejects.toThrow(/contactar/)
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' })
    await expect(make(vi.fn().mockRejectedValue(timeout)).complete({ user: 'u' })).rejects.toThrow(
      /tardó/,
    )
    const blocked = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
      })
    await expect(make(blocked).complete({ user: 'u' })).rejects.toThrow(/vacía/)
  })
})

describe('createAiClient', () => {
  it('elige el cliente según el proveedor', () => {
    expect(createAiClient({ provider: 'gemini', apiKey: 'k', model: 'm' }).provider).toBe('gemini')
    expect(createAiClient({ provider: 'anthropic', apiKey: 'k', model: 'm' }).provider).toBe(
      'anthropic',
    )
  })
  it('devuelve null para reglas, sin clave o proveedor desconocido', () => {
    expect(createAiClient({ provider: 'rules' })).toBeNull()
    expect(createAiClient({ provider: 'gemini', apiKey: null })).toBeNull()
    expect(createAiClient({ provider: 'otro', apiKey: 'k' })).toBeNull()
    expect(createAiClient(undefined)).toBeNull()
  })
})
