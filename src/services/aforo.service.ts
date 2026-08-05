import { AforoDia } from '@/types';

// `GET /api/aforo` todavía no existe en backend (bloqueante, sin confirmar — ver
// docs/backend-espacios-archetypes-spec.md §2 y FEEDBACK_BACKEND_MODALIDADES_RESERVA.md).
// Mientras tanto generamos aforo determinístico en cliente, igual que hizo el equipo Web
// con su `aforo-mock.ts`, para poder construir y probar la UI de `cupo_compartido` sin
// pegarle a un endpoint inexistente. Cuando el contrato real exista, reemplazar el cuerpo
// de `fetchAforoDia` por un `fetch` real — la firma ya está pensada para no cambiar en
// los call sites (incluye `accessToken`, sin uso hoy).

const CAPACIDAD_TOTAL_FALLBACK = 80;

function hashSeed(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export async function fetchAforoDia(
  espacioId: number,
  fecha: string,
  capacidadTotal: number | undefined,
  accessToken: string, // sin uso hoy — se mantiene para no cambiar la firma cuando esto sea un fetch real
): Promise<AforoDia> {
  const capacidad = capacidadTotal && capacidadTotal > 0 ? capacidadTotal : CAPACIDAD_TOTAL_FALLBACK;
  const seed = hashSeed(`${espacioId}-${fecha}`);
  // Fracción estable entre 20% y 70% de ocupación, para que la UI de aforo muestre algo
  // realista (ni siempre vacío ni siempre lleno) sin variar en cada render.
  const fraccionVendida = 0.2 + (seed % 51) / 100;
  const vendida = Math.min(capacidad, Math.round(capacidad * fraccionVendida));
  const disponible = Math.max(0, capacidad - vendida);

  return { fecha, capacidadTotal: capacidad, vendida, disponible };
}
