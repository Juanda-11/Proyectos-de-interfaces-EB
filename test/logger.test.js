import { describe, it, expect } from 'vitest'
import { createLogger } from '../src/utils/logger.js'

const capture = () => {
  const lines = []
  return { lines, stream: { write: (l) => lines.push(JSON.parse(l)) } }
}

describe('createLogger', () => {
  it('escribe una línea JSON con nivel, hora y campos', () => {
    const { lines, stream } = capture()
    createLogger({ stream }).info({ id: 1 }, 'hola')
    expect(lines[0]).toMatchObject({ level: 'info', msg: 'hola', id: 1 })
    expect(Date.parse(lines[0].time)).not.toBeNaN()
  })
  it('acepta solo el mensaje', () => {
    const { lines, stream } = capture()
    createLogger({ stream }).warn('solo texto')
    expect(lines[0]).toMatchObject({ level: 'warn', msg: 'solo texto' })
  })
  it('respeta el nivel mínimo', () => {
    const { lines, stream } = capture()
    const log = createLogger({ level: 'warn', stream })
    log.info('no')
    log.error('sí')
    expect(lines.map((l) => l.level)).toEqual(['error'])
  })
  it('silent no escribe nada', () => {
    const { lines, stream } = capture()
    createLogger({ level: 'silent', stream }).error('x')
    expect(lines).toEqual([])
  })
})
