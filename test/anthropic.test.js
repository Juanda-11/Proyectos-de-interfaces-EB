import { describe, it, expect, vi } from 'vitest'
import { createAnthropicClient, AIError } from '../src/services/ai/anthropic.js'

const ok = (content) => ({ ok: true, status: 200, json: async () => ({ content }) })

describe('createAnthropicClient', () => {
  it('envía la petición con la clave, el modelo y el sistema', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok([{ type: 'text', text: 'hola' }]))
    const client = createAnthropicClient({ apiKey: 'k', model: 'm', fetchImpl })
    expect(await client.complete({ system: 's', user: 'u' })).toBe('hola')
    const [, init] = fetchImpl.mock.calls[0]
    expect(init.headers['x-api-key']).toBe('k')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'm', system: 's', messages: [{ role: 'user', content: 'u' }] })
  })
  it('concatena solo bloques de texto', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok([{ type: 'text', text: 'a' }, { type: 'tool_use' }, { type: 'text', text: 'b' }]))
    expect(await createAnthropicClient({ apiKey: 'k', model: 'm', fetchImpl }).complete({ user: 'u' })).toBe('ab')
  })
  it('lanza AIError ante estados no exitosos', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 529 })
    await expect(createAnthropicClient({ apiKey: 'k', model: 'm', fetchImpl }).complete({ user: 'u' })).rejects.toThrow(AIError)
  })
  it('lanza AIError si la red falla o la respuesta viene vacía', async () => {
    const down = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    await expect(createAnthropicClient({ apiKey: 'k', model: 'm', fetchImpl: down }).complete({ user: 'u' })).rejects.toThrow(/contactar/)
    const empty = vi.fn().mockResolvedValue(ok([]))
    await expect(createAnthropicClient({ apiKey: 'k', model: 'm', fetchImpl: empty }).complete({ user: 'u' })).rejects.toThrow(/vacía/)
  })
})
