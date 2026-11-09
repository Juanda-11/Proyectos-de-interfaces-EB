import { HttpError } from '../utils/httpError.js'
import { t } from '../i18n.js'

/**
 * Exige un token válido en `Authorization: Bearer …` y deja el usuario en `req.user`.
 * Con la autenticación desactivada (`AUTH_ENABLED=false`) deja pasar todo.
 */
export const requireAuth =
  ({ config, service }) =>
  async (req, _res, next) => {
    try {
      if (!config.enabled) return next()
      if (!config.secret) {
        throw new HttpError(503, t(req.lang, 'authNotConfigured'), { code: 'AUTH_NOT_CONFIGURED' })
      }
      const header = req.get('authorization') ?? ''
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
      const user = token ? await service.authenticate(token) : null
      if (!user) throw new HttpError(401, t(req.lang, 'authRequired'), { code: 'UNAUTHORIZED' })
      req.user = user
      next()
    } catch (err) {
      next(err)
    }
  }
