import { Router } from 'express'
import { networkSchema } from '../schemas/network.js'
import { validateBody } from '../middleware/validate.js'
import { balanceFlows } from '../services/balance.js'
import { simulate } from '../services/simulation.js'

export function balanceRouter() {
  const router = Router()
  router.post('/balance', validateBody(networkSchema), (req, res) => {
    const result = balanceFlows(req.body)
    const notes = []
    if (result.unreached.length)
      notes.push(
        `${result.unreached.length} nodo(s) sin conexión a un tanque no se tuvieron en cuenta`,
      )
    if (result.loops.length)
      notes.push(`${result.loops.length} tubería(s) de anillo conservan su caudal`)
    const message = result.changes.length
      ? `Caudales recalculados en ${result.changes.length} tramo(s) para atender ${result.totalDemand} L/s de demanda total.`
      : `Los caudales ya coinciden con las demandas (${result.totalDemand} L/s en total).`
    res.json({
      ...result,
      message: notes.length ? `${message} Nota: ${notes.join('; ')}.` : message,
      simulation: simulate(result.network),
    })
  })
  return router
}
