import { Router } from 'express'
import { networkSchema } from '../schemas/network.js'
import { validateBody } from '../middleware/validate.js'
import { toEpanet } from '../services/epanet.js'

export function exportRouter() {
  const router = Router()
  router.post('/export/epanet', validateBody(networkSchema), (req, res) => {
    res
      .type('text/plain; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="hydrograph-red.inp"')
      .send(toEpanet(req.body))
  })
  return router
}
