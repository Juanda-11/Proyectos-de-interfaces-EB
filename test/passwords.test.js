import { describe, it, expect } from 'vitest'
import { hashPassword, safeEqual, verifyPassword } from '../src/services/auth/passwords.js'

describe('hashPassword / verifyPassword', () => {
  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('Clave-segura-1')
    expect(await verifyPassword('Clave-segura-1', hash)).toBe(true)
    expect(await verifyPassword('clave-segura-1', hash)).toBe(false)
  })
  it('usa una sal distinta cada vez y nunca guarda la contraseña', async () => {
    const [a, b] = await Promise.all([hashPassword('x1234567'), hashPassword('x1234567')])
    expect(a).not.toBe(b)
    expect(a).not.toContain('x1234567')
    expect(a.startsWith('scrypt$')).toBe(true)
  })
  it.each([[undefined], [''], ['texto'], ['md5$1$2$3$4$5'], ['scrypt$a$b$c$d$e']])(
    'rechaza hashes inválidos (%s)',
    async (stored) => {
      expect(await verifyPassword('lo-que-sea', stored)).toBe(false)
    },
  )
})

describe('safeEqual', () => {
  it('compara textos', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})
