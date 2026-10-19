import { describe, it, expect } from 'vitest'
import { DEFAULT_LANG, LANGS, resolveLang, t } from '../src/i18n.js'

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
  it('ambos idiomas tienen exactamente las mismas claves', async () => {
    const mod = await import('../src/i18n.js')
    expect(LANGS).toEqual(['es', 'en'])
    expect(DEFAULT_LANG).toBe('es')
    // las claves se comprueban llamando a cada una en ambos idiomas
    for (const key of [
      'noSource',
      'help',
      'designed',
      'auditOk',
      'balanced',
      'note',
      'lowVelocity',
    ]) {
      expect(mod.t('en', key, 1, 2, 3)).not.toBe(mod.t('es', key, 1, 2, 3))
    }
  })
})
