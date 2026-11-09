import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64
// Parámetros de scrypt: coste suficiente para frenar ataques de fuerza bruta sin penalizar un inicio de sesión
const COST = { N: 16384, r: 8, p: 1 }

/** Hash de contraseña con scrypt y sal aleatoria. Formato: `scrypt$N$r$p$sal$hash` (base64). */
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, KEY_LENGTH, COST)
  return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), key.toString('base64')].join(
    '$',
  )
}

/** Compara una contraseña con su hash en tiempo constante. Devuelve false ante cualquier formato inválido. */
export async function verifyPassword(password, stored) {
  const [scheme, n, r, p, salt, hash] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  try {
    const expected = Buffer.from(hash, 'base64')
    const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** Compara dos textos en tiempo constante (p. ej. la contraseña de la cuenta de demostración). */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}
