export { default as PaymentModal } from './components/PaymentModal';
export type { PaymentModalProps } from './components/PaymentModal';

export {
  PAYMENT_PROVIDER,
  SERVICE_FEE_RATE,
  DATAFAST_DIAGNOSTICO_DIRECTO_UAT,
  getPaymentConfig,
} from './config';
export type { PaymentProvider } from './config';

// ⚠️ Diagnóstico temporal mientras backend arregla la validación de
// `resourcePath` (ver FEEDBACK_BACKEND_DATAFAST.md). Se expone desde el barrel
// solo para que ninguna pantalla tenga que alcanzar dentro de `services/`;
// desaparece junto con el flag y el propio archivo cuando backend confirme.
export {
  reversarPagoDatafastDirecto,
  obtenerTransaccionDirecta,
} from './services/datafastDirectUat';
