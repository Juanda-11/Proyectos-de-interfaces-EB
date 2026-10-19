import { Router } from 'express'
import { networkSchema } from '../schemas/network.js'
import { validateBody } from '../middleware/validate.js'
import { simulate } from '../services/simulation.js'

export function simulateRouter() {
  const router = Router()
  router.post('/simulate', validateBody(networkSchema), (req, res) => {
    res.json(simulate(req.body, { lang: req.lang }))
  })
  return router
}
