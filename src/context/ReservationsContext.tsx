import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Espacio } from '@/types';

export interface Reserva {
  id: number;
  espacio: Espacio;
  fecha: string;
  cantidad: number;
  total: number;
  codigo: string;
  estado: 'Confirmada' | 'Cancelada';
}

interface NuevaReservaInput {
  espacio: Espacio;
  fecha: string;
  cantidad: number;
  total: number;
  codigo: string;
}

interface ReservationsContextValue {
  reservas: Reserva[];
  reservasCount: number;
  addReserva: (input: NuevaReservaInput) => void;
  cancelReserva: (id: number) => void;
}

const ReservationsContext = createContext<ReservationsContextValue | null>(null);

interface ReservationsProviderProps {
  children: ReactNode;
}

export const ReservationsProvider: React.FC<ReservationsProviderProps> = ({
  children,
}) => {
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const addReserva = useCallback((input: NuevaReservaInput): void => {
    setReservas(prev => [
      {
        id: Date.now(),
        estado: 'Confirmada',
        ...input,
      },
      ...prev,
    ]);
  }, []);

  const cancelReserva = useCallback((id: number): void => {
    setReservas(prev => prev.filter(reserva => reserva.id !== id));
  }, []);

  return (
    <ReservationsContext.Provider
      value={{
        reservas,
        reservasCount: reservas.length,
        addReserva,
        cancelReserva,
      }}>
      {children}
    </ReservationsContext.Provider>
  );
};

export function useReservationsContext(): ReservationsContextValue {
  const ctx = useContext(ReservationsContext);
  if (!ctx) {
    throw new Error(
      'useReservationsContext must be used within ReservationsProvider',
    );
  }
  return ctx;
}
