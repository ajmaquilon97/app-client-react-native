import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { Espacio, getModalidadReserva } from '@/features/espacios';
import { SERVICE_FEE_RATE } from '@/features/pagos';
import { toLocalDateTimeString } from '@/shared/utils/fechas';

import { CrearReservaInput, FacturacionInput, Reserva } from '../types';
import {
  useCancelarReserva,
  useCrearReserva,
  useRegistrarPago,
} from './useReservaMutations';
import { useAforoDia, useDisponibilidad } from './useReservasQueries';

/**
 * Si el cliente no completa los datos de facturación, se manda como "consumidor
 * final" (identificación genérica estándar en Ecuador para facturas sin RUC o
 * cédula real del comprador).
 */
const FACTURACION_CONSUMIDOR_FINAL: FacturacionInput = {
  identificacion: '9999999999999',
  nombre: 'Consumidor Final',
  correo: '',
};

interface UseReservaFlowParams {
  espacio: Espacio | null;
  /** El flujo se reinicia al cerrar la hoja de detalle. */
  visible: boolean;
  onReservaPagada: () => void;
}

/**
 * Máquina de estados de la reserva: selección → creación → pago.
 *
 * Vive fuera de `SpaceDetailSheet` para que el componente solo pinte. Antes esto
 * eran ~250 líneas mezcladas con el JSX, incluidos seis estados manuales para
 * disponibilidad y aforo que ahora son dos `useQuery`.
 */
export function useReservaFlow({ espacio, visible, onReservaPagada }: UseReservaFlowParams) {
  const { user } = useAuth();

  const modalidad = espacio ? getModalidadReserva(espacio) : 'franja_exclusiva';
  const esCupoCompartido = modalidad === 'cupo_compartido';

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [horaDesde, setHoraDesde] = useState<number | null>(null);
  const [horaHasta, setHoraHasta] = useState<number | null>(null);
  const [cantidadEntradas, setCantidadEntradas] = useState(1);
  const [showPayment, setShowPayment] = useState(false);
  const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null);

  const [identificacionFacturacion, setIdentificacionFacturacion] = useState('');
  const [razonSocialFacturacion, setRazonSocialFacturacion] = useState('');
  const [correoFacturacion, setCorreoFacturacion] = useState('');

  const disponibilidadQuery = useDisponibilidad(espacio?.id ?? null, visible ? selectedDate : null);
  const aforoQuery = useAforoDia(espacio?.id ?? null, visible ? selectedDate : null, esCupoCompartido);

  const disponibilidad = disponibilidadQuery.data ?? null;
  const aforo = aforoQuery.data ?? null;

  const crear = useCrearReserva();
  const pagar = useRegistrarPago();
  const cancelar = useCancelarReserva();

  const reset = useCallback(() => {
    setSelectedDate(null);
    setHoraDesde(null);
    setHoraHasta(null);
    setCantidadEntradas(1);
    setShowPayment(false);
    setReservaCreada(null);
    setIdentificacionFacturacion('');
    setRazonSocialFacturacion('');
    setCorreoFacturacion('');
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  // El aforo del día acota cuántas entradas se pueden pedir.
  const maxEntradas = aforo ? Math.max(aforo.disponible, 1) : undefined;
  const entradasAcotadas = maxEntradas ? Math.min(cantidadEntradas, maxEntradas) : cantidadEntradas;

  const handleChangeHoraDesde = useCallback((hora: number) => {
    setHoraDesde(hora);
    setHoraHasta(prev => (prev != null && prev > hora ? prev : null));
  }, []);

  const cantidadHoras = horaDesde != null && horaHasta != null ? horaHasta - horaDesde : 0;
  const cantidadUnidades = esCupoCompartido ? entradasAcotadas : cantidadHoras;
  const precioDelDia = disponibilidad?.tarifa?.precio ?? espacio?.precio ?? 0;
  const subtotal = cantidadUnidades > 0 ? precioDelDia * cantidadUnidades : 0;
  const comision = subtotal * SERVICE_FEE_RATE;
  const total = subtotal + comision;

  const construirInput = useCallback((): CrearReservaInput | null => {
    if (!espacio || !selectedDate) return null;

    const facturacionCompletada =
      identificacionFacturacion.trim() || razonSocialFacturacion.trim() || correoFacturacion.trim();
    const facturacion: FacturacionInput = facturacionCompletada
      ? {
          identificacion: identificacionFacturacion.trim(),
          nombre: razonSocialFacturacion.trim(),
          correo: correoFacturacion.trim(),
        }
      : FACTURACION_CONSUMIDOR_FINAL;

    // Convención acordada con el equipo Web para `cupo_compartido` (piscinas):
    // fechaInicio = fechaFin = el día elegido, sin franja horaria — ver
    // docs/backend-espacios-archetypes-spec.md §3. `totalHoras: 0` es un
    // placeholder: backend no confirmó qué espera para una venta de entrada.
    if (esCupoCompartido) {
      return {
        espacioId: espacio.id,
        fechaInicio: toLocalDateTimeString(selectedDate, 0),
        fechaFin: toLocalDateTimeString(selectedDate, 0),
        totalHoras: 0,
        pax: entradasAcotadas,
        facturacion,
      };
    }

    return {
      espacioId: espacio.id,
      fechaInicio: toLocalDateTimeString(selectedDate, horaDesde as number),
      fechaFin: toLocalDateTimeString(selectedDate, horaHasta as number),
      totalHoras: cantidadHoras,
      facturacion,
    };
  }, [
    espacio,
    selectedDate,
    esCupoCompartido,
    entradasAcotadas,
    horaDesde,
    horaHasta,
    cantidadHoras,
    identificacionFacturacion,
    razonSocialFacturacion,
    correoFacturacion,
  ]);

  const reservar = useCallback(() => {
    if (!espacio) return;

    if (!selectedDate) {
      Alert.alert('Faltan datos', 'Elige el día para tu reserva.', [{ text: 'Entendido' }]);
      return;
    }
    if (esCupoCompartido) {
      if (entradasAcotadas < 1) {
        Alert.alert('Faltan datos', 'Elige la cantidad de entradas para tu reserva.', [
          { text: 'Entendido' },
        ]);
        return;
      }
    } else if (horaDesde == null || horaHasta == null) {
      Alert.alert('Faltan datos', 'Elige el rango de horas (desde–hasta) para tu reserva.', [
        { text: 'Entendido' },
      ]);
      return;
    }
    if (!disponibilidad?.tarifa) {
      Alert.alert(
        'Tarifa no disponible',
        'Este espacio no tiene una tarifa configurada para el día elegido. Prueba con otro día.',
        [{ text: 'Entendido' }],
      );
      return;
    }

    const input = construirInput();
    if (!input) return;

    crear.mutate(
      { input, usuarioId: user?.id ?? '' },
      {
        onSuccess: nueva => {
          setReservaCreada(nueva);
          setShowPayment(true);
        },
        onError: err =>
          Alert.alert('No se pudo crear la reserva', err.message || 'Intenta de nuevo.', [
            { text: 'Entendido' },
          ]),
      },
    );
  }, [
    espacio,
    selectedDate,
    esCupoCompartido,
    entradasAcotadas,
    horaDesde,
    horaHasta,
    disponibilidad,
    construirInput,
    crear,
    user,
  ]);

  /**
   * Datafast ya registra el pago en backend al verificar la transacción, así que
   * el registro manual solo hace falta para pasarelas que todavía no lo
   * confirman del lado del servidor (Kushki).
   */
  const confirmarPago = useCallback(
    (result?: { pagoYaRegistrado?: boolean }) => {
      const terminar = () => {
        setShowPayment(false);
        setReservaCreada(null);
        setSelectedDate(null);
        setHoraDesde(null);
        setHoraHasta(null);
        onReservaPagada();
      };

      if (!reservaCreada || result?.pagoYaRegistrado) {
        terminar();
        return;
      }

      pagar.mutate(
        { reservaId: reservaCreada.id, monto: reservaCreada.pago.total ?? 0 },
        {
          onError: err =>
            Alert.alert(
              'Pago procesado, pero no se pudo registrar',
              err.message || 'Contacta soporte con tu comprobante.',
              [{ text: 'Entendido' }],
            ),
          onSettled: terminar,
        },
      );
    },
    [reservaCreada, pagar, onReservaPagada],
  );

  /** Cerrar el pago libera la reserva pendiente. Best effort: si falla, no bloquea la UI. */
  const cancelarPago = useCallback(() => {
    setShowPayment(false);
    if (!reservaCreada) return;
    cancelar.mutate({ reservaId: reservaCreada.id, motivo: 'Cliente canceló el pago' });
    setReservaCreada(null);
  }, [reservaCreada, cancelar]);

  return {
    modalidad,
    esCupoCompartido,

    selectedDate,
    setSelectedDate,
    horaDesde,
    horaHasta,
    handleChangeHoraDesde,
    setHoraHasta,
    cantidadEntradas: entradasAcotadas,
    setCantidadEntradas,

    identificacionFacturacion,
    setIdentificacionFacturacion,
    razonSocialFacturacion,
    setRazonSocialFacturacion,
    correoFacturacion,
    setCorreoFacturacion,

    disponibilidad,
    disponibilidadLoading: disponibilidadQuery.isFetching,
    disponibilidadError: disponibilidadQuery.isError
      ? (disponibilidadQuery.error?.message ?? 'No se pudo obtener la disponibilidad.')
      : null,

    aforo,
    aforoLoading: aforoQuery.isFetching,
    aforoError: aforoQuery.isError
      ? (aforoQuery.error?.message ?? 'No se pudo obtener el aforo disponible.')
      : null,

    cantidadHoras,
    cantidadUnidades,
    precioDelDia,
    subtotal,
    comision,
    total,

    reservar,
    creandoReserva: crear.isPending,
    reservaCreada,
    showPayment,
    confirmarPago,
    cancelarPago,
  };
}
