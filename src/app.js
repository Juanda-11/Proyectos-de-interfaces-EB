import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { loadConfig } from './config.js'
import { createLogger } from './utils/logger.js'
import { requestContext } from './middleware/requestContext.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { createAnthropicClient } from './services/ai/anthropic.js'
import { healthRouter } from './routes/health.js'
import { simulateRouter } from './routes/simulate.js'
import { copilotRouter } from './routes/copilot.js'
import { optimizeRouter } from './routes/optimize.js'
import { exportRouter } from './routes/export.js'
import { indexRouter } from './routes/index.js'

/**
 * Construye la aplicación Express. Todas las dependencias (configuración, logger,
 * cliente de IA) son inyectables para poder probarla sin red ni variables de entorno.
 */
export function createApp({ config = loadConfig(), log, ai } = {}) {
  log ??= createLogger({ level: config.env === 'test' ? 'silent' : 'info' })
  ai ??= config.ai.apiKey ? createAnthropicClient(config.ai) : null

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
    healthRouter({ config }),
    simulateRouter(),
    optimizeRouter(),
    exportRouter(),
    copilotRouter({ ai }),
  )

  app.use(notFound)
  app.use(errorHandler)
  return app
}
