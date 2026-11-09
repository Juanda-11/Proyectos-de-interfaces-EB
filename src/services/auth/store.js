/**
 * Almacenes de usuarios. Ambos exponen la misma interfaz:
 *   - `persistent`: si los usuarios sobreviven a un reinicio del servidor
 *   - `getByEmail(email)` → usuario o null
 *   - `create(user)` → true si se creó, false si el correo ya existía (operación atómica)
 */
export const normalizeEmail = (email) => String(email).trim().toLowerCase()

/** En memoria: sirve para desarrollo y pruebas; los usuarios se pierden al reiniciar. */
export function createMemoryUserStore() {
  const users = new Map()
  return {
    persistent: false,
    async getByEmail(email) {
      return users.get(normalizeEmail(email)) ?? null
    },
    async create(user) {
      const key = normalizeEmail(user.email)
      if (users.has(key)) return false
      users.set(key, { ...user, email: key })
      return true
    },
  }
}

/**
 * Upstash Redis a través de su API REST (sin controlador ni conexiones persistentes, ideal para
 * funciones serverless). Tiene nivel gratuito y se puede añadir desde el Marketplace de Vercel.
 */
export function createUpstashUserStore({ url, token, fetchImpl = fetch, timeoutMs = 5000 }) {
  const command = async (...args) => {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || body.error) throw new Error(`Upstash: ${body.error ?? res.status}`)
    return body.result
  }
  const key = (email) => `hydrograph:user:${normalizeEmail(email)}`

  return {
    persistent: true,
    async getByEmail(email) {
      const raw = await command('GET', key(email))
      return raw ? JSON.parse(raw) : null
    },
    async create(user) {
      const stored = { ...user, email: normalizeEmail(user.email) }
      // SET … NX solo escribe si la clave no existe: evita registros duplicados concurrentes
      const result = await command('SET', key(user.email), JSON.stringify(stored), 'NX')
      return result === 'OK'
    },
  }
}
