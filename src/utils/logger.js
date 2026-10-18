const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 }

/** Logger JSON de una línea por evento; suficiente para los logs de Vercel. */
export function createLogger({ level = 'info', stream = process.stdout } = {}) {
  const min = LEVELS[level] ?? LEVELS.info
  const write = (name) => (fields, msg) => {
    if (LEVELS[name] < min) return
    if (typeof fields === 'string') [fields, msg] = [{}, fields]
    stream.write(
      `${JSON.stringify({ level: name, time: new Date().toISOString(), msg, ...fields })}\n`,
    )
  }
  return { debug: write('debug'), info: write('info'), warn: write('warn'), error: write('error') }
}
