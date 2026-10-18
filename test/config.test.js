import { describe, it, expect } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  it('aplica valores por defecto', () => {
    const c = loadConfig({})
    expect(c).toMatchObject({
      env: 'development',
      port: 3001,
      corsOrigins: ['http://localhost:5173'],
    })
    expect(c.ai).toMatchObject({ provider: 'rules', apiKey: null })
  })
  it('separa varios orígenes CORS y recorta espacios', () => {
    expect(loadConfig({ CORS_ORIGINS: 'https://a.com, https://b.com ,' }).corsOrigins).toEqual([
      'https://a.com',
      'https://b.com',
    ])
  })
  it('trata una clave vacía como ausente', () => {
    expect(loadConfig({ ANTHROPIC_API_KEY: '' }).ai.apiKey).toBeNull()
  })
  it('falla con valores inválidos', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Configuración inválida/)
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/)
  })

  describe('proveedor de IA', () => {
    it('prefiere Gemini si hay clave', () => {
      const ai = loadConfig({ GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' }).ai
      expect(ai).toMatchObject({ provider: 'gemini', apiKey: 'g', model: 'gemini-2.5-flash' })
    })
    it('usa Anthropic si solo hay su clave', () => {
      expect(loadConfig({ ANTHROPIC_API_KEY: 'a' }).ai).toMatchObject({
        provider: 'anthropic',
        model: 'claude-haiku-5-5',
      })
    })
    it('AI_PROVIDER fuerza el proveedor y rules lo desactiva', () => {
      expect(
        loadConfig({ GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a', AI_PROVIDER: 'anthropic' }).ai
          .provider,
      ).toBe('anthropic')
      expect(loadConfig({ GEMINI_API_KEY: 'g', AI_PROVIDER: 'rules' }).ai.apiKey).toBeNull()
    })
    it('rechaza proveedores desconocidos', () => {
      expect(() => loadConfig({ AI_PROVIDER: 'gpt' })).toThrow(/AI_PROVIDER/)
    })
  })
})
