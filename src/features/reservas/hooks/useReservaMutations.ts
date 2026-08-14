import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  cancelarReserva,
  crearReserva,
  registrarPago,
} from '../services/reservas.service';
import { CrearReservaInput } from '../types';
import { MIS_RESERVAS_QUERY_KEY, reservaDetalleQueryKey } from './useReservasQueries';

/**
 * Todo lo que cambia una reserva mueve dos cosas: el listado del calendario y,
 * si la conocemos, la reserva concreta. `['reservas']` cubriría ambas por
 * prefijo, pero también arrastraría invitados y facturas, que no cambian aquí.
 */
function invalidarReserva(queryClient: QueryClient, reservaId?: number): void {
  queryClient.invalidateQueries({ queryKey: MIS_RESERVAS_QUERY_KEY });
  if (reservaId != null) {
    queryClient.invalidateQueries({ queryKey: reservaDetalleQueryKey(reservaId) });
  }
}

export function useCrearReserva() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, usuarioId }: { input: CrearReservaInput; usuarioId: string }) =>
      crearReserva(input, usuarioId),
    // La reserva ya existe en backend aunque esté 'pendiente': si el usuario
    // mira Calendario ahora, que la vea sin esperar al staleTime.
    onSuccess: nueva => invalidarReserva(queryClient, nueva.id),
  });
}

export function useRegistrarPago() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reservaId, monto }: { reservaId: number; monto: number }) =>
      registrarPago(reservaId, monto),
    onSuccess: (_reserva, { reservaId }) => invalidarReserva(queryClient, reservaId),
  });
}

export function useCancelarReserva() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reservaId, motivo }: { reservaId: number; motivo: string }) =>
      cancelarReserva(reservaId, motivo),
    onSuccess: (_reserva, { reservaId }) => invalidarReserva(queryClient, reservaId),
  });
}
