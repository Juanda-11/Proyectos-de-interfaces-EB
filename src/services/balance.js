/**
 * Balance de caudales: reparte las demandas de los nodos de consumo por los tramos de la
 * red en árbol que parte de los tanques. El caudal de cada tubería es la suma de las
 * demandas de todo lo que queda aguas abajo.
 *
 * Las tuberías que cierran un anillo y los nodos sin conexión a un tanque conservan su
 * caudal original (en una red mallada el reparto exige resolver el sistema de ecuaciones).
 */
export function balanceFlows(network) {
  const nodeById = new Map(network.nodes.map((n) => [n.id, n]))
  const adjacency = new Map(network.nodes.map((n) => [n.id, []]))
  for (const p of network.pipes) {
    adjacency.get(p.from).push({ pipe: p, other: p.to })
    adjacency.get(p.to).push({ pipe: p, other: p.from })
  }

  // Recorrido en anchura desde los tanques: orden de visita y tubería que llega a cada nodo
  const order = []
  const viaPipe = new Map() // nodo -> { pipe, parent }
  const seen = new Set()
  for (const n of network.nodes) {
    if (n.type !== 'tank') continue
    seen.add(n.id)
    order.push(n.id)
  }
  for (let i = 0; i < order.length; i++) {
    for (const { pipe, other } of adjacency.get(order[i])) {
      if (seen.has(other)) continue
      seen.add(other)
      viaPipe.set(other, { pipe, parent: order[i] })
      order.push(other)
    }
  }

  // De las hojas hacia el tanque: cada nodo suma su demanda a la de sus descendientes
  const load = new Map(order.map((id) => [id, nodeById.get(id).demand ?? 0]))
  for (let i = order.length - 1; i >= 0; i--) {
    const via = viaPipe.get(order[i])
    if (via) load.set(via.parent, load.get(via.parent) + load.get(order[i]))
  }

  const flows = new Map([...viaPipe].map(([id, { pipe }]) => [pipe.id, round(load.get(id))]))
  const changes = []
  const pipes = network.pipes.map((p) => {
    if (!flows.has(p.id) || flows.get(p.id) === p.flow) return p
    changes.push({ pipeId: p.id, from: p.flow, to: flows.get(p.id) })
    return { ...p, flow: flows.get(p.id) }
  })

  const totalDemand = round(
    order.filter((id) => !viaPipe.has(id)).reduce((s, id) => s + load.get(id), 0),
  )
  const unreached = network.nodes.filter((n) => !seen.has(n.id)).map((n) => n.id)
  const loops = network.pipes.filter((p) => !flows.has(p.id)).map((p) => p.id)
  return { network: { ...network, pipes }, changes, totalDemand, unreached, loops }
}

const round = (v) => Math.round(v * 100) / 100
