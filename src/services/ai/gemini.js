import { AIError } from './errors.js'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Cliente mínimo de la API de Google Gemini (generateContent). Tiene la misma forma que el
 * de Anthropic: `complete({ system, user, maxTokens })` devuelve el texto de la respuesta.
 * La clave viaja en la cabecera `x-goog-api-key`, nunca en la URL (no queda en los logs).
 */
export function createGeminiClient({ apiKey, model, timeoutMs = 15000, fetchImpl = fetch }) {
  return {
    provider: 'gemini',
    model,
    async complete({ system, user, maxTokens = 600 }) {
      let res
      try {
        res = await fetchImpl(`${BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch (err) {
        throw new AIError(
          err.name === 'TimeoutError'
            ? 'La IA tardó demasiado en responder'
            : 'No se pudo contactar a la IA',
          { cause: err },
        )
      }
      if (!res.ok) {
        throw new AIError(
          res.status === 429
            ? 'Se alcanzó el límite gratuito de la API de Gemini'
            : `La API de IA respondió ${res.status}`,
        )
      }
      const body = await res.json()
      const text = body.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim()
      if (!text) throw new AIError('Respuesta vacía de la IA')
      return text
    },
  }
}
