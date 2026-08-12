import React from 'react';
import { Espacio } from '@/types';
import { PAYMENT_PROVIDER } from '@/shared/config/paymentConfig';
import KushkiPaymentModal from './KushkiPaymentModal';
import DatafastPaymentModal from './DatafastPaymentModal';

export interface PaymentModalProps {
  visible: boolean;
  espacio: Espacio | null;
  fecha: string;
  cantidad: number;
  total: string;
  reservaId: number | null;
  onClose: () => void;
  onSuccess: (result: { transactionId: string; amount: string; pagoYaRegistrado?: boolean }) => void;
}

/**
 * Componente selector de pasarela de pago
 *
 * Elige automáticamente entre Kushki y Datafast según PAYMENT_PROVIDER en paymentConfig.ts
 *
 * Para cambiar de pasarela:
 * 1. Abre: src/config/paymentConfig.ts
 * 2. Cambia: export const PAYMENT_PROVIDER: PaymentProvider = 'kushki'; // ← Cambiar aquí
 *           a: export const PAYMENT_PROVIDER: PaymentProvider = 'datafast';
 * 3. ¡Listo! La app usará Datafast en lugar de Kushki
 */
const PaymentModal: React.FC<PaymentModalProps> = (props) => {
  if (PAYMENT_PROVIDER === 'kushki') {
    return <KushkiPaymentModal {...props} />;
  } else {
    return <DatafastPaymentModal {...props} />;
  }
};

export default PaymentModal;
