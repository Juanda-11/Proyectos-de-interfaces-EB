import { Router } from 'express'

export function healthRouter({ config }) {
  const router = Router()
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      ai: config.ai.apiKey ? config.ai.model : 'rules',
      provider: config.ai.apiKey ? config.ai.provider : 'rules',
    })
  })
  return router
}
