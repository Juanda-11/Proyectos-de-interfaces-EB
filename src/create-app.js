import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { loadConfig } from './config.js'
import { createLogger } from './utils/logger.js'
import { requestContext } from './middleware/requestContext.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { createAiClient } from './services/ai/index.js'
import { healthRouter } from './routes/health.js'
import { simulateRouter } from './routes/simulate.js'
import { copilotRouter } from './routes/copilot.js'
import { optimizeRouter } from './routes/optimize.js'
import { exportRouter } from './routes/export.js'
import { balanceRouter } from './routes/balance.js'
import { indexRouter } from './routes/index.js'
import { authRouter } from './routes/auth.js'
import { HttpError } from './utils/httpError.js'
import { t } from './i18n.js'
import { requireAuth } from './middleware/auth.js'
import { createAuthService } from './services/auth/service.js'
import { createTokenService } from './services/auth/tokens.js'
import { createMemoryUserStore, createUpstashUserStore } from './services/auth/store.js'

/**
 * Construye la aplicación Express. Todas las dependencias (configuración, logger,
 * cliente de IA) son inyectables para poder probarla sin red ni variables de entorno.
 */
export function createApp({ config = loadConfig(), log, ai, userStore } = {}) {
  log ??= createLogger({ level: config.env === 'test' ? 'silent' : 'info' })
  ai ??= createAiClient(config.ai)
  userStore ??= config.auth.upstash
    ? createUpstashUserStore(config.auth.upstash)
    : createMemoryUserStore()
  const auth = createAuthService({
    config: config.auth,
    store: userStore,
    tokens: createTokenService({
      secret: config.auth.secret ?? 'sin-configurar',
      ttl: config.auth.ttl,
    }),
    env: config.env,
  })
  const guard = requireAuth({ config: config.auth, service: auth })
  // Frena la fuerza bruta sobre contraseñas: pocos intentos por IP y ventana de 15 minutos
  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: config.env === 'test' ? 1000 : 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, _res, next) =>
      next(new HttpError(429, t(req.lang, 'tooManyAttempts'), { code: 'TOO_MANY_ATTEMPTS' })),
  })

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // Vercel actúa como proxy inverso

  app.use(requestContext(log))
  app.use(helmet())
  app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }))
  app.use(express.json({ limit: '256kb' }))
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitMax,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  )

  app.use(
    '/api',
    indexRouter(),
    healthRouter({ config, auth }),
    authRouter({ config: config.auth, service: auth, guard, limiter: authLimiter }),
    // A partir de aquí, todas las rutas exigen sesión iniciada
    guard,
    simulateRouter(),
    balanceRouter(),
    optimizeRouter(),
    exportRouter(),
    copilotRouter({ ai }),
  )

  app.get('/', (_req, res) => res.redirect('/api'))

  app.use(notFound)
  app.use(errorHandler)
  return app
}
