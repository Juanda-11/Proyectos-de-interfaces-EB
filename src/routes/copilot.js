import { Router } from 'express'
import { z } from 'zod'
import { networkSchema } from '../schemas/network.js'
import { validateBody } from '../middleware/validate.js'
import { HELP_MESSAGE, audit, classifyIntent, design } from '../services/copilot.js'

const bodySchema = z.object({
  prompt: z.string().trim().min(1, 'La orden no puede estar vacía').max(500),
  /** Red actual del editor; necesaria para auditar. */
  network: networkSchema.optional(),
})

export function copilotRouter({ ai }) {
  const router = Router()
  router.post('/copilot', validateBody(bodySchema), async (req, res) => {
    const { prompt, network } = req.body
    const intent = classifyIntent(prompt)
    const ctx = { ai, log: req.log }
    if (intent === 'design') return res.json(await design(prompt, ctx))
    if (intent === 'audit' && network) return res.json(await audit(network, ctx))
    const message = intent === 'audit' ? 'Para auditar necesito la red actual del editor.' : HELP_MESSAGE
    res.json({ intent: 'help', source: 'rules', message })
  })
  return router
}
