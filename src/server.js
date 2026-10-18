import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = createApp({ config })
const server = app.listen(config.port, () => {
  console.log(`HydroGraph AI API escuchando en http://localhost:${config.port} (IA: ${config.ai.apiKey ? config.ai.model : 'motor por reglas'})`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
