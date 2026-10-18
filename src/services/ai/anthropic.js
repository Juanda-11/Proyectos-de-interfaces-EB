const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

export class AIError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause })
    this.name = 'AIError'
  }
}

/**
 * Cliente mínimo de la API de mensajes de Anthropic. Recibe `fetchImpl` para poder
 * simularlo en las pruebas y expone una sola operación: `complete`.
 */
export function createAnthropicClient({ apiKey, model, timeoutMs = 15000, fetchImpl = fetch }) {
  return {
    model,
    async complete({ system, user, maxTokens = 600 }) {
      let res
      try {
        res = await fetchImpl(API_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': API_VERSION },
          body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch (err) {
        throw new AIError(err.name === 'TimeoutError' ? 'La IA tardó demasiado en responder' : 'No se pudo contactar a la IA', { cause: err })
      }
      if (!res.ok) throw new AIError(`La API de IA respondió ${res.status}`)
      const body = await res.json()
      const text = body.content?.filter((b) => b.type === 'text').map((b) => b.text).join('')
      if (!text) throw new AIError('Respuesta vacía de la IA')
      return text
    },
  }
}
