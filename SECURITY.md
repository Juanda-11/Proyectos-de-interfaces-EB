# Seguridad

- No subas claves al repositorio: `GEMINI_API_KEY` y `ANTHROPIC_API_KEY` se configuran solo como variable de entorno (en Vercel: _Settings → Environment Variables_).
- Para reportar una vulnerabilidad, abre un aviso privado en la pestaña _Security_ del repositorio.

## Medidas implementadas

- Validación estricta de todas las entradas con zod (tipos, rangos, integridad de la red).
- Límite de tamaño del cuerpo (256 kB) y de peticiones por minuto y por IP.
- Cabeceras de seguridad con `helmet` y CORS restringido a los orígenes configurados.
- Los errores internos no exponen trazas al cliente.
- La salida de la IA se valida con un esquema y se limita a rangos seguros antes de usarse; ante cualquier fallo se recurre al motor por reglas.
