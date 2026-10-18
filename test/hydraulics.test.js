import { describe, it, expect } from 'vitest'
import { velocity, suggestDiameter, headLoss, minorLoss, pipeLength } from '../src/services/hydraulics.js'

describe('velocity', () => {
  it('calcula Q/A', () => {
    // 8 L/s en DN50 -> 4.07 m/s
    expect(velocity(8, 50)).toBeCloseTo(4.074, 2)
    // 4 L/s en DN100 -> 0.51 m/s
    expect(velocity(4, 100)).toBeCloseTo(0.509, 2)
  })
  it('es 0 sin caudal', () => expect(velocity(0, 100)).toBe(0))
})

describe('suggestDiameter', () => {
  it('devuelve múltiplos de 25 mm que cumplen v <= 2 m/s', () => {
    for (const q of [1, 4, 8, 12, 30]) {
      const dn = suggestDiameter(q)
      expect(dn % 25).toBe(0)
      expect(velocity(q, dn)).toBeLessThanOrEqual(2.0001)
    }
  })
  it('8 L/s requieren DN75', () => expect(suggestDiameter(8)).toBe(75))
  it('nunca baja de 25 mm', () => expect(suggestDiameter(0.01)).toBe(25))
})

describe('headLoss (Hazen-Williams)', () => {
  it('coincide con un valor de referencia', () => {
    // 10 L/s, DN100, 100 m, C=130 -> ~1.9 m
    expect(headLoss(10, 100, 100, 130)).toBeCloseTo(1.86, 1)
  })
  it('crece al reducir el diámetro', () => {
    expect(headLoss(10, 75, 100)).toBeGreaterThan(headLoss(10, 100, 100))
  })
  it('es 0 sin caudal o sin longitud', () => {
    expect(headLoss(0, 100, 100)).toBe(0)
    expect(headLoss(10, 100, 0)).toBe(0)
  })
})

describe('minorLoss', () => {
  it('K·v²/2g', () => expect(minorLoss(2, 3)).toBeCloseTo(0.9174, 3))
})

describe('pipeLength', () => {
  it('aplica la escala del lienzo', () => {
    expect(pipeLength({ x: 0, y: 0 }, { x: 300, y: 400 })).toBeCloseTo(250)
    expect(pipeLength({ x: 0, y: 0 }, { x: 30, y: 40 }, 1)).toBeCloseTo(50)
  })
})
