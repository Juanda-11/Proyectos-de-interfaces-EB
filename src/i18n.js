/**
 * Mensajes de la API en español (por defecto) e inglés. El idioma lo decide la cabecera
 * `Accept-Language` de la petición; las funciones de servicio reciben `lang` explícitamente.
 */
export const LANGS = ['es', 'en']
export const DEFAULT_LANG = 'es'

/** Idioma preferido según la cabecera Accept-Language (solo se distingue «en» de «es»). */
export function resolveLang(header) {
  const first = String(header ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  return first.startsWith('en') ? 'en' : DEFAULT_LANG
}

const num = (v) => String(v)

const messages = {
  es: {
    noSource: () => 'La red no tiene ningún tanque que la alimente.',
    noSourceFix: () => 'Agrega un tanque y conéctalo a la red.',
    disconnected: (n) => `${n} no está conectado a ningún tanque.`,
    disconnectedFix: () => 'Conéctalo con una tubería a la red alimentada.',
    negativePressure: (n, p) =>
      `${n} tiene presión negativa (${num(p)} m.c.a.): riesgo de cavitación y succión de contaminantes.`,
    raiseHead: () => 'Aumenta la altura de bomba o el diámetro de los tramos aguas arriba.',
    lowPressure: (n, p, min) =>
      `${n} tiene ${num(p)} m.c.a., por debajo del mínimo de servicio (${min}).`,
    highPressure: (n, p, max) => `${n} supera la presión máxima (${num(p)} > ${max} m.c.a.).`,
    highPressureFix: () => 'Instala una válvula reductora de presión o reduce la altura de bomba.',
    highVelocity: (pipe, v, max) =>
      `El tramo ${pipe} circula a ${num(v)} m/s (máx. recomendado ${max} m/s).`,
    useDn: (dn) => `Usa DN${dn}.`,
    lowVelocity: (pipe, v) => `El tramo ${pipe} circula a ${num(v)} m/s: riesgo de sedimentación.`,

    // generador
    tank: 'Tanque',
    pump: 'Bomba',
    junction: 'Nodo',
    sector: 'Sector',

    // copiloto
    help: 'Puedo diseñar redes ("Diseñar red para 3 sectores") o auditar la red actual ("Auditar presiones").',
    needNetwork: () => 'Para auditar necesito la red actual del editor.',
    designed: (sectors, demand, pipes) =>
      `Red generada: 1 tanque, 1 bomba y ${sectors} sectores de ${demand} L/s con ${pipes} tuberías dimensionadas por velocidad (≤ 2 m/s).`,
    designedTail: () => 'Pulsa "Simular Flujo" para verificar presiones.',
    auditOk: (v, p) =>
      `Auditoría completa: velocidades (máx. ${v} m/s) y presiones (mín. ${p} m.c.a.) dentro de rango. La red es estable.`,
    auditProblems: (count, extra, lines) => `Detecté ${count} problema(s)${extra}: ${lines}`,
    auditMore: (n) => ` (y ${n} más)`,
    answerLang: 'español',

    // optimizador y balance
    nothingToOptimize: () => 'La red ya cumple los criterios de diseño; no hay nada que optimizar.',
    noAutoFix: (n) =>
      `No encontré ajustes automáticos; quedan ${n} problema(s) por revisar manualmente.`,
    appliedChanges: (n, parts, tail) => `Apliqué ${n} cambio(s) — ${parts}.${tail}`,
    partDiameters: (list) => `diámetros: ${list}`,
    partPump: (list) => `altura de bomba: ${list}`,
    stable: () => ' La red queda estable.',
    remaining: (n) => ` Quedan ${n} problema(s) por revisar.`,
    balanced: (n, total) =>
      `Caudales recalculados en ${n} tramo(s) para atender ${total} L/s de demanda total.`,
    alreadyBalanced: (total) =>
      `Los caudales ya coinciden con las demandas (${total} L/s en total).`,
    noteUnreached: (n) => `${n} nodo(s) sin conexión a un tanque no se tuvieron en cuenta`,
    noteLoops: (n) => `${n} tubería(s) de anillo conservan su caudal`,
    note: (list) => ` Nota: ${list}.`,
  },
  en: {
    noSource: () => 'The network has no tank feeding it.',
    noSourceFix: () => 'Add a tank and connect it to the network.',
    disconnected: (n) => `${n} is not connected to any tank.`,
    disconnectedFix: () => 'Connect it with a pipe to the supplied network.',
    negativePressure: (n, p) =>
      `${n} has negative pressure (${num(p)} m.w.c.): risk of cavitation and contaminant intrusion.`,
    raiseHead: () => 'Increase the pump head or the diameter of the upstream pipes.',
    lowPressure: (n, p, min) =>
      `${n} has ${num(p)} m.w.c., below the minimum service pressure (${min}).`,
    highPressure: (n, p, max) => `${n} exceeds the maximum pressure (${num(p)} > ${max} m.w.c.).`,
    highPressureFix: () => 'Install a pressure-reducing valve or lower the pump head.',
    highVelocity: (pipe, v, max) =>
      `Pipe ${pipe} flows at ${num(v)} m/s (recommended max. ${max} m/s).`,
    useDn: (dn) => `Use DN${dn}.`,
    lowVelocity: (pipe, v) => `Pipe ${pipe} flows at ${num(v)} m/s: risk of sedimentation.`,

    tank: 'Tank',
    pump: 'Pump',
    junction: 'Node',
    sector: 'Sector',

    help: 'I can design networks ("Design a network for 3 sectors") or audit the current one ("Audit pressures").',
    needNetwork: () => 'To audit I need the current network from the editor.',
    designed: (sectors, demand, pipes) =>
      `Network generated: 1 tank, 1 pump and ${sectors} sectors of ${demand} L/s with ${pipes} pipes sized by velocity (≤ 2 m/s).`,
    designedTail: () => 'Press "Simulate flow" to check pressures.',
    auditOk: (v, p) =>
      `Audit complete: velocities (max. ${v} m/s) and pressures (min. ${p} m.w.c.) are within range. The network is stable.`,
    auditProblems: (count, extra, lines) => `I found ${count} problem(s)${extra}: ${lines}`,
    auditMore: (n) => ` (and ${n} more)`,
    answerLang: 'English',

    nothingToOptimize: () => 'The network already meets the design criteria; nothing to optimize.',
    noAutoFix: (n) => `No automatic fixes found; ${n} problem(s) remain to be reviewed manually.`,
    appliedChanges: (n, parts, tail) => `Applied ${n} change(s) — ${parts}.${tail}`,
    partDiameters: (list) => `diameters: ${list}`,
    partPump: (list) => `pump head: ${list}`,
    stable: () => ' The network is now stable.',
    remaining: (n) => ` ${n} problem(s) remain to be reviewed.`,
    balanced: (n, total) =>
      `Flows recalculated on ${n} pipe(s) to supply ${total} L/s of total demand.`,
    alreadyBalanced: (total) => `Flows already match the demands (${total} L/s in total).`,
    noteUnreached: (n) => `${n} node(s) not connected to a tank were ignored`,
    noteLoops: (n) => `${n} loop pipe(s) keep their flow`,
    note: (list) => ` Note: ${list}.`,
  },
}

/** Devuelve el mensaje `key` en `lang`; si es una función, la llama con `args`. */
export function t(lang, key, ...args) {
  const entry = messages[lang]?.[key] ?? messages[DEFAULT_LANG][key]
  return typeof entry === 'function' ? entry(...args) : entry
}
