import { Espacio, ModalidadReserva } from './types';

// Backend ya expone `modalidadReserva` en el catálogo de tipos de espacio (ver
// docs/instrucciones-equipo-mobile-modalidades-reserva.md §2.1). El fallback por
// categoría queda como red de seguridad ante datos incompletos.
export function getModalidadReserva(
  espacio: Pick<Espacio, 'categoria' | 'modalidadReserva'>,
): ModalidadReserva {
  if (espacio.modalidadReserva) return espacio.modalidadReserva;
  return espacio.categoria === 'piscinas' ? 'cupo_compartido' : 'franja_exclusiva';
}
