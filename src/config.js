import { randomBytes } from 'node:crypto'
import { z } from 'zod'

const bool = (def) =>
  z
    .enum(['true', 'false'])
    .default(def)
    .transform((v) => v === 'true')

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

  /** Autenticación: si es false, la API queda abierta (útil solo en desarrollo). */
  AUTH_ENABLED: bool('true'),
  /** Secreto para firmar los tokens (mínimo 32 caracteres). Obligatorio en producción. */
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET debe tener al menos 32 caracteres').optional(),
  AUTH_TOKEN_TTL: z.string().default('7d'),
  /** Registro de cuentas: «auto» lo habilita solo si hay almacenamiento persistente (o fuera de producción). */
  AUTH_REGISTRATION: z.enum(['auto', 'on', 'off']).default('auto'),
  /** Cuenta de demostración, siempre disponible (no necesita base de datos). */
  DEMO_ENABLED: bool('true'),
  DEMO_EMAIL: z.string().email().default('demo@hydrograph.ai'),
  DEMO_PASSWORD: z.string().min(8).default('Hydro2026!'),
  DEMO_NAME: z.string().min(2).default('Cuenta de demostración'),
  /** Si es true, /api/health publica las credenciales de la cuenta de demostración. */
  DEMO_HINT: bool('true'),
  /** Almacenamiento persistente de usuarios (Upstash Redis o Vercel KV, ambos con API REST). */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
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
    auth: resolveAuth(c),
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

function resolveAuth(c) {
  const url = c.UPSTASH_REDIS_REST_URL ?? c.KV_REST_API_URL
  const token = c.UPSTASH_REDIS_REST_TOKEN ?? c.KV_REST_API_TOKEN
  // Sin secreto en producción la autenticación queda «sin configurar»; fuera de ella se genera uno efímero
  const secret =
    c.AUTH_SECRET ?? (c.NODE_ENV === 'production' ? null : randomBytes(32).toString('hex'))
  return {
    enabled: c.AUTH_ENABLED,
    secret,
    ttl: c.AUTH_TOKEN_TTL,
    registration: c.AUTH_REGISTRATION,
    demo: {
      enabled: c.DEMO_ENABLED,
      email: c.DEMO_EMAIL,
      password: c.DEMO_PASSWORD,
      name: c.DEMO_NAME,
      hint: c.DEMO_HINT,
    },
    upstash: url && token ? { url, token } : null,
  }
}
