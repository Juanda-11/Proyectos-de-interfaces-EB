// Punto de entrada de Vercel (framework Express). Vercel busca un archivo que importe
// `express` y exporte la aplicación por defecto; la app real se construye en create-app.js.
// Para ejecutarla en local usa `npm run dev` (src/local-server.js).
import express from 'express'
import { createApp } from './create-app.js'

const app = express()
app.set('trust proxy', 1)
app.use(createApp())

export default app
