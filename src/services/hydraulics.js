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

/**
 * Pérdida de carga por fricción (m) con Hazen-Williams en unidades SI:
 * hf = 10.67 · L · Q^1.852 / (C^1.852 · D^4.87)
 */
export function headLoss(flowLps, diameterMm, lengthM, roughnessC = 130) {
  if (flowLps <= 0 || lengthM <= 0) return 0
  const q = flowLps / 1000
  const d = diameterMm / 1000
  return (10.67 * lengthM * q ** 1.852) / (roughnessC ** 1.852 * d ** 4.87)
}

/** Pérdida local (m) = K · v² / 2g, usada en válvulas. */
export function minorLoss(k, velocityMs) {
  return (k * velocityMs ** 2) / (2 * GRAVITY)
}
