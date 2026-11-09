import { describe, it, expect } from 'vitest'
import { SignJWT } from 'jose'
import { createTokenService } from '../src/services/auth/tokens.js'

const user = { id: 'u1', email: 'ana@example.com', name: 'Ana' }
const secret = 'a'.repeat(32)

describe('createTokenService', () => {
  it('emite un token que se verifica y devuelve los datos del usuario', async () => {
    const tokens = createTokenService({ secret })
    const token = await tokens.sign(user)
    expect(token.split('.')).toHaveLength(3)
    expect(await tokens.verify(token)).toEqual(user)
  })
  it('rechaza tokens firmados con otro secreto', async () => {
    const token = await createTokenService({ secret }).sign(user)
    expect(await createTokenService({ secret: 'b'.repeat(32) }).verify(token)).toBeNull()
  })
  it('rechaza tokens manipulados o con formato inválido', async () => {
    const tokens = createTokenService({ secret })
    const [h, p, s] = (await tokens.sign(user)).split('.')
    const forged = Buffer.from(
      JSON.stringify({ sub: 'admin', email: 'x@y.z', name: 'X' }),
    ).toString('base64url')
    expect(await tokens.verify(`${h}.${forged}.${s}`)).toBeNull()
    expect(await tokens.verify(`${h}.${p}.`)).toBeNull()
    for (const bad of ['', 'abc', 'a.b.c', undefined, null])
      expect(await tokens.verify(bad)).toBeNull()
  })
  it('rechaza tokens caducados', async () => {
    const tokens = createTokenService({ secret, ttl: '1s' })
    const expired = await new SignJWT({ email: user.email, name: user.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer('hydrograph-ai')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(secret))
    expect(await tokens.verify(expired)).toBeNull()
  })
  it('rechaza tokens de otro emisor y el algoritmo «none»', async () => {
    const tokens = createTokenService({ secret })
    const other = await new SignJWT({ email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer('otro')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(secret))
    expect(await tokens.verify(other)).toBeNull()
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'u1', iss: 'hydrograph-ai' })).toString('base64url')}.`
    expect(await tokens.verify(none)).toBeNull()
  })
})
