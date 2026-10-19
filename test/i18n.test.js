import { describe, it, expect } from 'vitest'
import { DEFAULT_LANG, LANGS, catalog, resolveLang, t } from '../src/i18n.js'

describe('resolveLang', () => {
  it.each([
    ['en-US,en;q=0.9,es;q=0.8', 'en'],
    ['EN', 'en'],
    ['es-CO,es;q=0.9,en;q=0.5', 'es'],
    ['fr-FR', 'es'],
    ['', 'es'],
    [undefined, 'es'],
  ])('%s -> %s', (header, lang) => expect(resolveLang(header)).toBe(lang))
})

describe('t', () => {
  it('traduce textos simples y funciones', () => {
    expect(t('en', 'tank')).toBe('Tank')
    expect(t('es', 'tank')).toBe('Tanque')
    expect(t('en', 'useDn', 75)).toBe('Use DN75.')
    expect(t('es', 'useDn', 75)).toBe('Usa DN75.')
  })
  it('usa español si el idioma no existe', () => {
    expect(t('fr', 'tank')).toBe('Tanque')
  })
  it('ambos idiomas tienen exactamente las mismas claves', () => {
    expect(LANGS).toEqual(['es', 'en'])
    expect(DEFAULT_LANG).toBe('es')
    expect(Object.keys(catalog.en).sort()).toEqual(Object.keys(catalog.es).sort())
  })
})

describe('catálogo completo', () => {
  it('cada mensaje se puede generar en ambos idiomas con argumentos de ejemplo', () => {
    for (const lang of LANGS) {
      for (const key of Object.keys(catalog[lang])) {
        const text = t(lang, key, 'A', 2.5, 3)
        expect(typeof text, `${lang}.${key}`).toBe('string')
        expect(text.length, `${lang}.${key}`).toBeGreaterThan(0)
      }
    }
  })
  it('los mensajes con parámetros los incorporan', () => {
    expect(t('es', 'lowPressure', 'S1', 4.2, 10)).toContain('S1')
    expect(t('en', 'lowPressure', 'S1', 4.2, 10)).toContain('4.2')
    expect(t('en', 'routeNotFound', 'GET', '/x')).toBe('Route not found: GET /x')
  })
})
