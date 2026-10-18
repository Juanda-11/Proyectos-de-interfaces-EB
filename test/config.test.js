import { describe, it, expect } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  it('aplica valores por defecto', () => {
    const c = loadConfig({})
    expect(c).toMatchObject({ env: 'development', port: 3001, corsOrigins: ['http://localhost:5173'] })
    expect(c.ai).toMatchObject({ apiKey: null, model: 'claude-haiku-5-5' })
  })
  it('separa varios orígenes CORS y recorta espacios', () => {
    expect(loadConfig({ CORS_ORIGINS: 'https://a.com, https://b.com ,' }).corsOrigins).toEqual(['https://a.com', 'https://b.com'])
  })
  it('trata una clave vacía como ausente', () => {
    expect(loadConfig({ ANTHROPIC_API_KEY: '' }).ai.apiKey).toBeNull()
  })
  it('falla con valores inválidos', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Configuración inválida/)
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/)
  })
})
