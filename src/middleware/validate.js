import { HttpError } from '../utils/httpError.js'

/** Valida `req.body` con un esquema zod y deja el resultado ya normalizado en `req.body`. */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    return next(new HttpError(400, 'Datos de entrada inválidos', { code: 'VALIDATION_ERROR', details }))
  }
  req.body = result.data
  next()
}
