import { SignJWT, jwtVerify } from 'jose'

const ALGORITHM = 'HS256'
const ISSUER = 'hydrograph-ai'

/**
 * Emite y verifica tokens de sesión (JWT firmados con HS256). El token lleva el id, el correo y
 * el nombre del usuario, de modo que las rutas protegidas no necesitan consultar la base de datos.
 */
export function createTokenService({ secret, ttl = '7d' }) {
  const key = new TextEncoder().encode(secret)
  return {
    async sign(user) {
      return new SignJWT({ email: user.email, name: user.name })
        .setProtectedHeader({ alg: ALGORITHM })
        .setSubject(user.id)
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(key)
    },
    /** Devuelve `{ id, email, name }` o `null` si el token es inválido, está manipulado o caducó. */
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key, {
          algorithms: [ALGORITHM],
          issuer: ISSUER,
        })
        return { id: payload.sub, email: payload.email, name: payload.name }
      } catch {
        return null
      }
    },
  }
}
