import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/context/AuthContext';
import { toDateOnlyString } from '@/shared/utils/fechas';

import { fetchAforoDia } from '../services/aforo.service';
import {
  facturasReserva,
  fetchDisponibilidad,
  misReservas,
  reservaDetalle,
} from '../services/reservas.service';
import { AforoDia, Disponibilidad, FacturaStatus, Reserva } from '../types';

export const MIS_RESERVAS_QUERY_KEY = ['reservas', 'mias'] as const;

export const reservaDetalleQueryKey = (id: number) => ['reservas', id, 'detalle'] as const;

export const facturasReservaQueryKey = (reservaId: number) =>
  ['reservas', reservaId, 'facturas'] as const;

export const disponibilidadQueryKey = (espacioId: number, fecha: string) =>
  ['espacios', espacioId, 'disponibilidad', fecha] as const;

export const aforoDiaQueryKey = (espacioId: number, fecha: string) =>
  ['espacios', espacioId, 'aforo', fecha] as const;

export function useMisReservas() {
  const { isAuthenticated } = useAuth();

  return useQuery<Reserva[]>({
    queryKey: MIS_RESERVAS_QUERY_KEY,
    queryFn: misReservas,
    enabled: isAuthenticated,
  });
}

export function useReservaDetalle(id: number) {
  const { isAuthenticated } = useAuth();

  return useQuery<Reserva>({
    queryKey: reservaDetalleQueryKey(id),
    queryFn: () => reservaDetalle(id),
    enabled: isAuthenticated && !!id,
    staleTime: 30 * 1000,
  });
}

export function useFacturasReserva(reservaId: number) {
  const { isAuthenticated } = useAuth();

  return useQuery<FacturaStatus[]>({
    queryKey: facturasReservaQueryKey(reservaId),
    queryFn: () => facturasReserva(reservaId),
    enabled: isAuthenticated && !!reservaId,
    staleTime: 30 * 1000,
  });
}

/**
 * Sustituye a los tres estados manuales (`disponibilidad`, `...Loading`,
 * `...Error`) que sincronizaba a mano `SpaceDetailSheet`. Cachear por día tiene
 * un efecto visible: volver a un día ya consultado deja de parpadear.
 *
 * `staleTime` corto a propósito: los huecos los puede ocupar otro cliente en
 * cualquier momento.
 */
export function useDisponibilidad(espacioId: number | null, fecha: Date | null) {
  const { isAuthenticated } = useAuth();
  const fechaStr = fecha ? toDateOnlyString(fecha) : '';

  return useQuery<Disponibilidad>({
    queryKey: disponibilidadQueryKey(espacioId ?? -1, fechaStr),
    queryFn: () => fetchDisponibilidad(espacioId as number, fechaStr),
    enabled: isAuthenticated && espacioId != null && !!fechaStr,
    staleTime: 30 * 1000,
  });
}

/** Solo aplica a espacios `cupo_compartido` (piscinas): de ahí el `enabled`. */
export function useAforoDia(espacioId: number | null, fecha: Date | null, activo: boolean) {
  const { isAuthenticated } = useAuth();
  const fechaStr = fecha ? toDateOnlyString(fecha) : '';

  return useQuery<AforoDia>({
    queryKey: aforoDiaQueryKey(espacioId ?? -1, fechaStr),
    queryFn: () => fetchAforoDia(espacioId as number, fechaStr),
    enabled: isAuthenticated && activo && espacioId != null && !!fechaStr,
    staleTime: 30 * 1000,
  });
}
