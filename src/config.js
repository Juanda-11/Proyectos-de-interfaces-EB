import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  /** Orígenes permitidos por CORS, separados por comas. "*" permite cualquiera. */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  /** Proveedor de IA. Por defecto: Gemini si hay GEMINI_API_KEY, luego Anthropic, y si no, reglas. */
  AI_PROVIDER: z.enum(['gemini', 'anthropic', 'rules']).optional(),
  /** Clave de Google AI Studio (nivel gratuito). */
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  /** Clave de la API de Anthropic. */
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-5-5'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
})

/** En Vercel (y al copiar .env.example) una variable sin valor llega como cadena vacía: se trata como ausente. */
const withoutEmpty = (env) => Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ''))

export function loadConfig(env = process.env) {
  const parsed = envSchema.safeParse(withoutEmpty(env))
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
    ai: resolveAi(c),
  }
}

function resolveAi(c) {
  const timeoutMs = c.AI_TIMEOUT_MS
  const gemini = {
    provider: 'gemini',
    apiKey: c.GEMINI_API_KEY || null,
    model: c.GEMINI_MODEL,
    timeoutMs,
  }
  const anthropic = {
    provider: 'anthropic',
    apiKey: c.ANTHROPIC_API_KEY || null,
    model: c.ANTHROPIC_MODEL,
    timeoutMs,
  }
  const rules = { provider: 'rules', apiKey: null, model: null, timeoutMs }
  if (c.AI_PROVIDER === 'rules') return rules
  if (c.AI_PROVIDER === 'gemini') return gemini
  if (c.AI_PROVIDER === 'anthropic') return anthropic
  if (gemini.apiKey) return gemini
  if (anthropic.apiKey) return anthropic
  return rules
}
