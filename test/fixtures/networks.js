const node = (id, type, x, y, name, pressure, elevation, demand) => ({
  id, type, x, y, name, pressure, elevation, ...(demand ? { demand } : {}),
})

/** Red demo del editor: tanque → bomba → nodo → 3 sectores (el último subdimensionado). */
export const demoNetwork = () => ({
  nodes: [
    node('T1', 'tank', 120, 300, 'Tanque T1', 15, 15),
    node('P1', 'pump', 280, 300, 'Bomba B1', 30, 0),
    node('J1', 'junction', 440, 300, 'Nodo J1', 22, 0, 4),
    node('S1', 'junction', 660, 180, 'Sector 1', 22, 0, 4),
    node('S2', 'junction', 660, 300, 'Sector 2', 22, 0, 4),
    node('S3', 'junction', 660, 420, 'Sector 3', 22, 0, 4),
  ],
  pipes: [
    { id: 'a', from: 'T1', to: 'P1', diameter: 150, flow: 12 },
    { id: 'b', from: 'P1', to: 'J1', diameter: 150, flow: 12 },
    { id: 'c0', from: 'J1', to: 'S1', diameter: 100, flow: 4 },
    { id: 'c1', from: 'J1', to: 'S2', diameter: 100, flow: 4 },
    { id: 'c2', from: 'J1', to: 'S3', diameter: 50, flow: 8 },
  ],
})
