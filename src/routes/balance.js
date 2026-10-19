import { Router } from 'express'
import { networkSchema } from '../schemas/network.js'
import { validateBody } from '../middleware/validate.js'
import { balanceFlows } from '../services/balance.js'
import { simulate } from '../services/simulation.js'
import { t } from '../i18n.js'

export function balanceRouter() {
  const router = Router()
  router.post('/balance', validateBody(networkSchema), (req, res) => {
    const lang = req.lang
    const result = balanceFlows(req.body)
    const notes = []
    if (result.unreached.length) notes.push(t(lang, 'noteUnreached', result.unreached.length))
    if (result.loops.length) notes.push(t(lang, 'noteLoops', result.loops.length))
    const message = result.changes.length
      ? t(lang, 'balanced', result.changes.length, result.totalDemand)
      : t(lang, 'alreadyBalanced', result.totalDemand)
    res.json({
      ...result,
      message: notes.length ? `${message}${t(lang, 'note', notes.join('; '))}` : message,
      simulation: simulate(result.network, { lang }),
    })
  })
  return router
}
