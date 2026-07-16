// Shared across Home.tsx and Servicios.tsx so the two pages can't drift out
// of sync. Only "Cefalometría Digital" has real copy authored in Figma
// (component 44:82) — the rest are draft placeholders pending real copy
// from OrthoRad. Review before launch.
export interface ServiceInfo {
  index: string;
  name: string;
  duration: string;
  description: string;
}

export const services: ServiceInfo[] = [
  {
    index: "01",
    name: "Tomografía Dental 3D",
    duration: "10-20 min",
    description:
      "Reconstrucción tridimensional de alta precisión de maxilares y estructuras óseas. Ideal para planificación de implantes, extracciones complejas y evaluación de conductos y nervios.",
  },
  {
    index: "02",
    name: "Cefalometría Digital",
    duration: "10-20 min",
    description:
      "Imágenes de alta resolución sin radiación ionizante. Ideal para diagnóstico de tejidos blandos, cerebro, columna vertebral y articulaciones.",
  },
  {
    index: "03",
    name: "Radiografía Panorámica",
    duration: "10-20 min",
    description:
      "Vista completa de ambas arcadas dentales, articulaciones y senos maxilares en una sola imagen. El punto de partida ideal de toda evaluación dental completa.",
  },
  {
    index: "04",
    name: "Radiografía Periapical",
    duration: "10-20 min",
    description:
      "Imagen detallada de una o dos piezas dentales completas, desde la corona hasta la raíz y el hueso circundante. Fundamental para detectar caries profundas e infecciones.",
  },
  {
    index: "05",
    name: "Radiografías Bite Wing",
    duration: "10-20 min",
    description:
      "Muestra las coronas de los dientes superiores e inferiores en una sola toma. Ideal para detectar caries interproximales tempranas y evaluar el nivel del hueso de soporte.",
  },
];
