import { Router } from 'express'
import pkg from '../../package.json' with { type: 'json' }

/** Índice de la API: nombre, versión y endpoints disponibles. */
export function indexRouter() {
  const router = Router()
  router.get('/', (_req, res) => {
    res.json({
      name: 'HydroGraph AI API',
      version: pkg.version,
      docs: 'https://github.com/Juanda-11/Proyectos-de-interfaces-EB/blob/main/docs/openapi.yaml',
      endpoints: [
        'GET /api/health',
        'POST /api/simulate',
        'POST /api/optimize',
        'POST /api/export/epanet',
        'POST /api/copilot',
      ],
    })
  })
  return router
}
