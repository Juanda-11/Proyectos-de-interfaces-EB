# HydroGraph AI — Backend

API REST de **HydroGraph AI**, editor de redes de suministro de agua asistido por IA (proyecto final de _Diseño de Interfaces_). Calcula la hidráulica de la red, la audita, la optimiza, la exporta a EPANET y atiende al copiloto en lenguaje natural.

> Frontend: [Proyectos-de-interfaces-E](https://github.com/Juanda-11/Proyectos-de-interfaces-E)

## Qué hace

| Endpoint                  | Descripción                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /api/health`         | Estado del servicio y motor de IA activo                                                         |
| `POST /api/simulate`      | Velocidad y pérdida de carga (Hazen-Williams) por tubería, presión por nodo y lista de problemas |
| `POST /api/balance`       | Calcula los caudales de cada tramo a partir de las demandas de los nodos                         |
| `POST /api/optimize`      | Corrige diámetros con velocidad excesiva y sube la altura de bombas si falta presión             |
| `POST /api/export/epanet` | Descarga la red como archivo `.inp` de EPANET 2                                                  |
| `POST /api/copilot`       | Orden en lenguaje natural: diseñar una red o auditar la actual                                   |

La especificación completa está en [`docs/openapi.yaml`](docs/openapi.yaml).

## Ejecutar en local

```bash
npm install
cp .env.example .env     # opcional: añade GEMINI_API_KEY para activar la IA
npm run dev              # http://localhost:3001
```

```bash
curl -s localhost:3001/api/copilot -H 'content-type: application/json' \
  -d '{"prompt":"Diseñar red para 4 sectores"}'
```

## Variables de entorno

| Variable            | Por defecto             | Uso                                                                                                          |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `PORT`              | `3001`                  | Puerto local                                                                                                 |
| `CORS_ORIGINS`      | `http://localhost:5173` | Orígenes permitidos, separados por comas. En producción, la URL del frontend                                 |
| `RATE_LIMIT_MAX`    | `60`                    | Peticiones por minuto y por IP                                                                               |
| `GEMINI_API_KEY`    | —                       | Activa el copiloto con **Gemini** (clave gratuita de [Google AI Studio](https://aistudio.google.com/apikey)) |
| `GEMINI_MODEL`      | `gemini-2.5-flash`      | Modelo de Gemini; alternativa si Google retira el modelo o se necesita otro con más cupo gratuito            |
| `ANTHROPIC_API_KEY` | —                       | Alternativa: copiloto con Claude                                                                             |
| `ANTHROPIC_MODEL`   | `claude-haiku-5-5`      | Modelo de Anthropic                                                                                          |
| `AI_PROVIDER`       | automático              | `gemini`, `anthropic` o `rules`. Por defecto: Gemini si hay clave, luego Anthropic, luego reglas             |
| `AI_TIMEOUT_MS`     | `15000`                 | Tiempo máximo de espera a la IA                                                                              |

## Idiomas

Los mensajes de la API (problemas detectados, sugerencias, respuestas del copiloto, errores y nombres de los componentes generados) están en **español e inglés**. El idioma se elige con la cabecera `Accept-Language` (`en` → inglés; por defecto, español). El copiloto también pide al modelo de IA que responda en ese idioma y entiende órdenes en ambos.

## Cómo funciona la IA

El copiloto **no deja que el modelo invente la red**. El modelo (Gemini o Claude) interpreta la petición (`"un barrio con cinco manzanas"` → `{sectors: 5, demandPerSector: 6}`) y el backend construye la red con fórmulas hidráulicas, de modo que el resultado siempre es válido y dimensionado. Para auditar, el modelo solo redacta una explicación a partir de los resultados de la simulación.

Cualquier fallo de la IA (sin clave, timeout, JSON inválido, valores fuera de rango) hace que se use el motor por reglas, y la respuesta indica `"source": "ai" | "rules"`.

## Modelo hidráulico

- Velocidad `v = Q / A`; máximo recomendado 2,5 m/s; diámetros sugeridos para `v ≤ 2 m/s` en múltiplos de 25 mm.
- Pérdida por fricción de **Hazen-Williams** (`C = 130` por defecto) y pérdida local en válvulas (`K = 2,5`).
- Presiones por propagación de la altura piezométrica desde los tanques: cada bomba suma su altura y cada tramo resta su pérdida. Rango de servicio: 10–70 m.c.a.
- La longitud de cada tubería sale de las coordenadas del lienzo (1 unidad = 0,5 m) salvo que se indique `length`.

**Limitaciones:** los caudales los define el usuario (no se resuelve el balance de caudales); en redes malladas, los tramos que cierran un anillo se evalúan por velocidad y pérdida pero no alteran las presiones. Para estudios formales, exporta a EPANET.

## Despliegue en Vercel

1. En Vercel: **Add New → Project**, importa este repositorio (el preset es _Other_, no hay paso de build).
2. En _Settings → Environment Variables_ define `CORS_ORIGINS` con la URL del frontend (p. ej. `https://hydrograph-ai.vercel.app`) y, opcionalmente, `GEMINI_API_KEY` (gratuita) para activar la IA.
3. Despliega. Vercel detecta Express y usa [`src/index.js`](src/index.js) como entrada (no hace falta `vercel.json`).
4. Comprueba `https://<tu-backend>.vercel.app/api/health`.
5. El [frontend](https://github.com/Juanda-11/Proyectos-de-interfaces-E/blob/main/docs/DEPLOY.md) se despliega después, con `VITE_API_URL` apuntando a esta URL.

También hay un [`Dockerfile`](Dockerfile) para ejecutarlo en cualquier otro servidor.

## Desarrollo

```bash
npm test             # pruebas (Vitest + Supertest)
npm run coverage     # cobertura
npm run lint         # ESLint
npm run format       # Prettier
```

```
src/
├── create-app.js       # Construcción de la app Express (dependencias inyectables)
├── index.js            # Entrada de Vercel (export por defecto de la app)
├── local-server.js     # Arranque local
├── config.js           # Variables de entorno validadas
├── routes/             # health, simulate, optimize, export, copilot
├── services/
│   ├── hydraulics.js   # Fórmulas
│   ├── simulation.js   # Alturas, presiones y problemas
│   ├── optimizer.js    # Correcciones automáticas
│   ├── generator.js    # Diseño de redes
│   ├── copilot.js      # Diseño y auditoría con IA + respaldo por reglas
│   ├── epanet.js       # Exportación .inp
│   └── ai/anthropic.js # Cliente de la API de Anthropic
├── schemas/network.js  # Validación (zod)
└── middleware/         # errores, validación, contexto de petición
```

## Licencia

MIT
