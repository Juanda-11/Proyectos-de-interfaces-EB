import { randomUUID } from 'node:crypto'
import { resolveLang } from '../i18n.js'

/** Asigna un id a cada petición, lo devuelve en `X-Request-Id` y registra su duración. */
export const requestContext = (log) => (req, res, next) => {
  const incoming = req.get('x-request-id')
  req.lang = resolveLang(req.get('accept-language'))
  req.id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID()
  req.log = log
  res.set('X-Request-Id', req.id)
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    log.info(
      {
        id: req.id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Math.round(ms),
      },
      'request',
    )
  })
  next()
}
