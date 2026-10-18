import { z } from 'zod'

export const NODE_TYPES = ['tank', 'pump', 'valve', 'junction']

const finite = z.number().finite()

export const nodeSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(NODE_TYPES),
  name: z.string().max(80).default(''),
  x: finite,
  y: finite,
  /** Tanque: nivel de agua (m). Bomba: altura que aporta (m). */
  pressure: finite.min(0).max(500).default(0),
  /** Cota del terreno (m). */
  elevation: finite.min(-500).max(5000).default(0),
  /** Demanda en nodos de consumo (L/s). */
  demand: finite.min(0).max(1000).optional(),
})

export const pipeSchema = z.object({
  id: z.string().min(1).max(40),
  from: z.string().min(1).max(40),
  to: z.string().min(1).max(40),
  /** Diámetro nominal (mm). */
  diameter: finite.min(10).max(2000),
  /** Caudal (L/s). */
  flow: finite.min(0).max(5000),
  /** Longitud (m); si falta se calcula con las coordenadas. */
  length: finite.positive().max(100000).optional(),
  /** Coeficiente de rugosidad de Hazen-Williams. */
  roughness: finite.min(50).max(160).optional(),
})

export const networkSchema = z
  .object({
    nodes: z.array(nodeSchema).min(1).max(200),
    pipes: z.array(pipeSchema).max(400),
  })
  .superRefine((net, ctx) => {
    const ids = new Set()
    net.nodes.forEach((n, i) => {
      if (ids.has(n.id))
        ctx.addIssue({
          code: 'custom',
          path: ['nodes', i, 'id'],
          message: `id de nodo duplicado: ${n.id}`,
        })
      ids.add(n.id)
    })
    const pipeIds = new Set()
    net.pipes.forEach((p, i) => {
      if (pipeIds.has(p.id))
        ctx.addIssue({
          code: 'custom',
          path: ['pipes', i, 'id'],
          message: `id de tubería duplicado: ${p.id}`,
        })
      pipeIds.add(p.id)
      if (p.from === p.to)
        ctx.addIssue({
          code: 'custom',
          path: ['pipes', i],
          message: 'una tubería no puede unir un nodo consigo mismo',
        })
      for (const end of ['from', 'to']) {
        if (!ids.has(p[end]))
          ctx.addIssue({
            code: 'custom',
            path: ['pipes', i, end],
            message: `el nodo ${p[end]} no existe`,
          })
      }
    })
  })
