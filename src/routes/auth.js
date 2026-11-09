import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { HttpError } from '../utils/httpError.js'
import { t } from '../i18n.js'

const email = z.string().trim().email().max(254)
const loginSchema = z.object({ email, password: z.string().min(1).max(128) })
const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  password: z.string().min(8).max(128),
})

/**
 * Rutas públicas de cuentas. `guard` es el middleware que protege `/me`;
 * `limiter` frena los intentos repetidos de inicio de sesión y registro.
 */
export function authRouter({ service, guard, limiter }) {
  const router = Router()
  const ensureReady = (req, _res, next) =>
    req.authConfig.enabled && !req.authConfig.secret
      ? next(new HttpError(503, t(req.lang, 'authNotConfigured'), { code: 'AUTH_NOT_CONFIGURED' }))
      : next()

  router.post(
    '/auth/login',
    limiter,
    ensureReady,
    validateBody(loginSchema),
    async (req, res, next) => {
      try {
        const result = await service.login(req.body.email, req.body.password)
        if (!result) {
          throw new HttpError(401, t(req.lang, 'invalidCredentials'), {
            code: 'INVALID_CREDENTIALS',
          })
        }
        res.json(result)
      } catch (err) {
        next(err)
      }
    },
  )

  router.post(
    '/auth/register',
    limiter,
    ensureReady,
    validateBody(registerSchema),
    async (req, res, next) => {
      try {
        const result = await service.register(req.body)
        if (result === 'disabled') {
          throw new HttpError(403, t(req.lang, 'registrationDisabled'), {
            code: 'REGISTRATION_DISABLED',
          })
        }
        if (result === 'exists') {
          throw new HttpError(409, t(req.lang, 'emailTaken'), { code: 'EMAIL_TAKEN' })
        }
        res.status(201).json(result)
      } catch (err) {
        next(err)
      }
    },
  )

  router.get('/auth/me', guard, (req, res) => {
    res.json({ user: req.user ?? null })
  })

  return router
}
