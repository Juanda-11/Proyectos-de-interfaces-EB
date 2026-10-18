/**
 * Fórmulas hidráulicas básicas. Unidades de entrada: caudal en L/s, diámetro en mm,
 * longitud en m. Las salidas se documentan en cada función.
 */

export const GRAVITY = 9.81
/** Velocidad máxima recomendada en redes de distribución (m/s). */
export const MAX_VELOCITY = 2.5
/** Velocidad de diseño usada al dimensionar un tramo (m/s). */
export const DESIGN_VELOCITY = 2
/** Velocidad mínima para evitar sedimentación (m/s). */
export const MIN_VELOCITY = 0.3

/** Velocidad (m/s) = Q / A. */
export function velocity(flowLps, diameterMm) {
  const area = (Math.PI * (diameterMm / 1000) ** 2) / 4
  return flowLps / 1000 / area
}

/**
 * Diámetro comercial mínimo (múltiplo de 25 mm) para que la velocidad no pase de
 * `targetVelocity`. Devuelve al menos 25 mm.
 */
export function suggestDiameter(flowLps, targetVelocity = DESIGN_VELOCITY) {
  const exact = Math.sqrt((4 * (flowLps / 1000)) / (Math.PI * targetVelocity)) * 1000
  return Math.max(25, Math.ceil(exact / 25) * 25)
}
