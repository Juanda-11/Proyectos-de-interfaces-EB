import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import request from 'supertest'
import { createApp } from '../src/create-app.js'
import { loadConfig } from '../src/config.js'
import { demoNetwork } from './fixtures/networks.js'

const spec = parse(readFileSync(new URL('../docs/openapi.yaml', import.meta.url), 'utf8'))
const app = createApp({ config: loadConfig({ NODE_ENV: 'test' }) })

describe('contrato OpenAPI', () => {
  it('documenta los mismos endpoints que expone el índice de la API', async () => {
    const { body } = await request(app).get('/api')
    const documented = Object.entries(spec.paths).flatMap(([path, ops]) =>
      Object.keys(ops).map((m) => `${m.toUpperCase()} ${path}`),
    )
    expect(documented.sort()).toEqual([...body.endpoints].sort())
  })

  it('la respuesta de /api/simulate incluye todas las propiedades documentadas', async () => {
    const { body } = await request(app).post('/api/simulate').send(demoNetwork())
    const schema = spec.components.schemas.Simulation.properties
    expect(Object.keys(body).sort()).toEqual(Object.keys(schema).sort())
    expect(Object.keys(body.summary).sort()).toEqual(Object.keys(schema.summary.properties).sort())
    expect(Object.keys(body.pipes[0]).sort()).toEqual(
      Object.keys(schema.pipes.items.properties).sort(),
    )
    expect(Object.keys(body.nodes[0]).sort()).toEqual(
      Object.keys(schema.nodes.items.properties).sort(),
    )
  })
})
