import { createAnthropicClient } from './anthropic.js'
import { createGeminiClient } from './gemini.js'

/**
 * Devuelve el cliente de IA descrito por `config.ai`, o `null` para usar el motor por reglas.
 */
export function createAiClient(ai) {
  if (!ai || ai.provider === 'rules' || !ai.apiKey) return null
  if (ai.provider === 'gemini') return createGeminiClient(ai)
  if (ai.provider === 'anthropic') return createAnthropicClient(ai)
  return null
}
