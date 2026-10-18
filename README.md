# HydroGraph AI — Backend

API REST de **HydroGraph AI**, editor de redes de suministro de agua asistido por IA (proyecto final de _Diseño de Interfaces_). Calcula la hidráulica de la red, la audita, la optimiza, la exporta a EPANET y atiende al copiloto en lenguaje natural.

> Frontend: [Proyectos-de-interfaces-E](https://github.com/Juanda-11/Proyectos-de-interfaces-E)

## Qué hace

| Endpoint                  | Descripción                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /api/health`         | Estado del servicio y motor de IA activo                                                         |
| `POST /api/simulate`      | Velocidad y pérdida de carga (Hazen-Williams) por tubería, presión por nodo y lista de problemas |
| `POST /api/optimize`      | Corrige diámetros con velocidad excesiva y sube la altura de bombas si falta presión             |
| `POST /api/export/epanet` | Descarga la red como archivo `.inp` de EPANET 2                                                  |
| `POST /api/copilot`       | Orden en lenguaje natural: diseñar una red o auditar la actual                                   |

La especificación completa está en [`docs/openapi.yaml`](docs/openapi.yaml).

## Ejecutar en local

```bash
npm install
cp .env.example .env     # opcional: añade ANTHROPIC_API_KEY
npm run dev              # http://localhost:3001
```

```bash
curl -s localhost:3001/api/copilot -H 'content-type: application/json' \
  -d '{"prompt":"Diseñar red para 4 sectores"}'
```

## Variables de entorno

| Variable            | Por defecto             | Uso                                                                          |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `PORT`              | `3001`                  | Puerto local                                                                 |
| `CORS_ORIGINS`      | `http://localhost:5173` | Orígenes permitidos, separados por comas. En producción, la URL del frontend |
| `RATE_LIMIT_MAX`    | `60`                    | Peticiones por minuto y por IP                                               |
| `ANTHROPIC_API_KEY` | —                       | Activa el copiloto con Claude. Sin ella funciona el motor por reglas         |
| `ANTHROPIC_MODEL`   | `claude-haiku-5-5`      | Modelo usado por el copiloto                                                 |
| `AI_TIMEOUT_MS`     | `15000`                 | Tiempo máximo de espera a la IA                                              |

## Cómo funciona la IA

El copiloto **no deja que el modelo invente la red**. Claude interpreta la petición (`"un barrio con cinco manzanas"` → `{sectors: 5, demandPerSector: 6}`) y el backend construye la red con fórmulas hidráulicas, de modo que el resultado siempre es válido y dimensionado. Para auditar, Claude solo redacta una explicación a partir de los resultados de la simulación.

Cualquier fallo de la IA (sin clave, timeout, JSON inválido, valores fuera de rango) hace que se use el motor por reglas, y la respuesta indica `"source": "ai" | "rules"`.

## Modelo hidráulico

- Velocidad `v = Q / A`; máximo recomendado 2,5 m/s; diámetros sugeridos para `v ≤ 2 m/s` en múltiplos de 25 mm.
- Pérdida por fricción de **Hazen-Williams** (`C = 130` por defecto) y pérdida local en válvulas (`K = 2,5`).
- Presiones por propagación de la altura piezométrica desde los tanques: cada bomba suma su altura y cada tramo resta su pérdida. Rango de servicio: 10–70 m.c.a.
- La longitud de cada tubería sale de las coordenadas del lienzo (1 unidad = 0,5 m) salvo que se indique `length`.

**Limitaciones:** los caudales los define el usuario (no se resuelve el balance de caudales); en redes malladas, los tramos que cierran un anillo se evalúan por velocidad y pérdida pero no alteran las presiones. Para estudios formales, exporta a EPANET.

## Despliegue en Vercel

1. En Vercel: **Add New → Project**, importa este repositorio (el preset es _Other_, no hay paso de build).
2. En _Settings → Environment Variables_ define `CORS_ORIGINS` con la URL del frontend (p. ej. `https://hydrograph-ai.vercel.app`) y, si quieres IA, `ANTHROPIC_API_KEY`.
3. Despliega. [`vercel.json`](vercel.json) enruta `/api/*` a la función [`api/index.js`](api/index.js).
4. Comprueba `https://<tu-backend>.vercel.app/api/health`.
5. Despliega el [frontend](https://github.com/Juanda-11/Proyectos-de-interfaces-E/blob/main/docs/DEPLOY.md) con `VITE_API_URL` apuntando a esta URL.

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
├── app.js              # Construcción de la app Express (dependencias inyectables)
├── server.js           # Arranque local
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
api/index.js            # Entrada serverless de Vercel
```

## Licencia

MIT
