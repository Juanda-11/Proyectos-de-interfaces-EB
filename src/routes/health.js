import { Router } from 'express'

export function healthRouter({ config, auth }) {
  const router = Router()
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      ai: config.ai.apiKey ? config.ai.model : 'rules',
      provider: config.ai.apiKey ? config.ai.provider : 'rules',
      auth: {
        enabled: config.auth.enabled,
        configured: !config.auth.enabled || Boolean(config.auth.secret),
        registration: auth.registrationEnabled,
        // Credenciales públicas de la cuenta de demostración (se pueden ocultar con DEMO_HINT=false)
        demo:
          config.auth.demo.enabled && config.auth.demo.hint
            ? { email: config.auth.demo.email, password: config.auth.demo.password }
            : null,
      },
    })
  })
  return router
}
