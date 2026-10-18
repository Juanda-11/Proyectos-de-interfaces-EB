import { HttpError } from '../utils/httpError.js'

export function notFound(req, _res, next) {
  next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.path}`, { code: 'NOT_FOUND' }))
}

// Express identifica los manejadores de error por su aridad (4 argumentos)
export function errorHandler(err, req, res, _next) {
  let status = err.status ?? err.statusCode ?? 500
  let code = err.code ?? 'INTERNAL_ERROR'
  let message = err.message
  if (err.type === 'entity.parse.failed')
    [status, code, message] = [400, 'INVALID_JSON', 'El cuerpo no es JSON válido']
  if (err.type === 'entity.too.large')
    [status, code, message] = [
      413,
      'PAYLOAD_TOO_LARGE',
      'El cuerpo de la petición es demasiado grande',
    ]
  if (!(err instanceof HttpError) && status >= 500) {
    req.log?.error({ err: err.stack }, 'error no controlado')
    ;[status, code, message] = [500, 'INTERNAL_ERROR', 'Error interno del servidor']
  }
  res.status(status).json({
    error: {
      code: typeof code === 'string' ? code : 'ERROR',
      message,
      ...(err.details ? { details: err.details } : {}),
      requestId: req.id,
    },
  })
}
