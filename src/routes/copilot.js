import { Router } from 'express'
import { z } from 'zod'
import { networkSchema } from '../schemas/network.js'
import { validateBody } from '../middleware/validate.js'
import { t } from '../i18n.js'
import { audit, classifyIntent, design, helpMessage } from '../services/copilot.js'

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  /** Red actual del editor; necesaria para auditar. */
  network: networkSchema.optional(),
})

export function copilotRouter({ ai }) {
  const router = Router()
  router.post('/copilot', validateBody(bodySchema), async (req, res) => {
    const { prompt, network } = req.body
    const intent = classifyIntent(prompt)
    const ctx = { ai, log: req.log, lang: req.lang }
    if (intent === 'design') return res.json(await design(prompt, ctx))
    if (intent === 'audit' && network) return res.json(await audit(network, ctx))
    const message = intent === 'audit' ? t(req.lang, 'needNetwork') : helpMessage(req.lang)
    res.json({ intent: 'help', source: 'rules', message })
  })
  return router
}
