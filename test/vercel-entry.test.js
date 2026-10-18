import { describe, it, expect } from 'vitest'
import request from 'supertest'
import handler from '../src/index.js'

describe('src/index.js (entrada de Vercel)', () => {
  it('exporta una app Express funcional', async () => {
    const res = await request(handler).get('/api/health')
    expect(res.status).toBe(200)
  })
})
