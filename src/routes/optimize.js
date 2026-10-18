import { Router } from 'express'
import { networkSchema } from '../schemas/network.js'
import { validateBody } from '../middleware/validate.js'
import { optimize } from '../services/optimizer.js'

export function optimizeRouter() {
  const router = Router()
  router.post('/optimize', validateBody(networkSchema), (req, res) => {
    res.json(optimize(req.body))
  })
  return router
}
