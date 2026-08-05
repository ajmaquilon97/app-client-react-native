import { Espacio, ModalidadReserva } from '@/types';

// Backend todavía no expone `modalidadReserva` en el catálogo de tipos de espacio
// (ver docs/backend-espacios-archetypes-spec.md §1, bloqueante y sin confirmar). Mientras
// tanto inferimos el archetype por categoría, igual que el parche temporal que hizo el
// equipo Web con su mapa `codigo → archetype`. Cuando backend confirme el campo, basta
// con mapearlo en espacios.service.ts — este helper ya prioriza `espacio.modalidadReserva`
// si viene presente, así que deja de usar el fallback automáticamente.
export function getModalidadReserva(
  espacio: Pick<Espacio, 'categoria' | 'modalidadReserva'>,
): ModalidadReserva {
  if (espacio.modalidadReserva) return espacio.modalidadReserva;
  return espacio.categoria === 'piscinas' ? 'cupo_compartido' : 'franja_exclusiva';
}
