import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  /** Orígenes permitidos por CORS, separados por comas. "*" permite cualquiera. */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  /** Clave de la API de Anthropic. Sin ella el backend usa el motor por reglas. */
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-5-5'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
})

export function loadConfig(env = process.env) {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Configuración inválida: ${detail}`)
  }
  const c = parsed.data
  return {
    env: c.NODE_ENV,
    port: c.PORT,
    corsOrigins: c.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    rateLimitMax: c.RATE_LIMIT_MAX,
    ai: {
      apiKey: c.ANTHROPIC_API_KEY || null,
      model: c.ANTHROPIC_MODEL,
      timeoutMs: c.AI_TIMEOUT_MS,
    },
  }
}
