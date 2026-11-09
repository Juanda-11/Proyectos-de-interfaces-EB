import { randomUUID } from 'node:crypto'
import { hashPassword, safeEqual, verifyPassword } from './passwords.js'
import { normalizeEmail } from './store.js'

/** Hash de relleno: se verifica cuando el correo no existe para que el tiempo de respuesta no delate qué cuentas hay. */
const DUMMY_HASH = await hashPassword('relleno-para-igualar-tiempos')

const publicUser = ({ id, email, name }) => ({ id, email, name })

/**
 * Lógica de cuentas: inicio de sesión, registro y verificación de tokens.
 * `config` es `config.auth`; `store` y `tokens` se inyectan para poder probarla sin red.
 */
export function createAuthService({ config, store, tokens, env = 'development' }) {
  const demoEmail = normalizeEmail(config.demo.email)
  const demoUser = { id: 'demo', email: demoEmail, name: config.demo.name }

  const registrationEnabled =
    config.registration === 'on' ||
    (config.registration === 'auto' && (store.persistent || env !== 'production'))

  const session = async (user) => ({ user: publicUser(user), token: await tokens.sign(user) })

  return {
    registrationEnabled,
    demoEnabled: config.demo.enabled,

    /** Devuelve `{ user, token }` o `null` si las credenciales no son válidas. */
    async login(email, password) {
      const key = normalizeEmail(email)
      if (config.demo.enabled && key === demoEmail) {
        return safeEqual(password, config.demo.password) ? session(demoUser) : null
      }
      const user = await store.getByEmail(key)
      const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
      return user && ok ? session(user) : null
    },

    /** Devuelve `{ user, token }`, `'disabled'` (registro apagado) o `'exists'` (correo ya usado). */
    async register({ name, email, password }) {
      if (!registrationEnabled) return 'disabled'
      const key = normalizeEmail(email)
      if (config.demo.enabled && key === demoEmail) return 'exists'
      const user = {
        id: randomUUID(),
        email: key,
        name: name.trim(),
        passwordHash: await hashPassword(password),
        createdAt: new Date().toISOString(),
      }
      return (await store.create(user)) ? session(user) : 'exists'
    },

    /** Usuario `{ id, email, name }` del token, o `null`. */
    authenticate: (token) => tokens.verify(token),
  }
}
