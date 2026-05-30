/**
 * Configuración de Pasarelas de Pago
 * Cambia PAYMENT_PROVIDER para hacer pruebas con Kushki o Datafast
 */

export type PaymentProvider = 'kushki' | 'datafast';

// ─── CAMBIAR AQUÍ PARA HACER PRUEBAS ───
export const PAYMENT_PROVIDER: PaymentProvider = 'kushki'; // ← 'kushki' o 'datafast'

// ─── Configuración Kushki ───
export const KUSHKI_CONFIG = {
  environment: 'uat', // 'uat' o 'prod'
  publicKey: 'PUBLIC_TEST_KEY_REPLACE_WITH_YOURS', // Obtén de dashboard Kushki
  apiUrl: 'https://api-uat.kushkipagos.com', // UAT
  // apiUrl: 'https://api.kushkipagos.com', // PROD
  testCards: {
    visa: {
      number: '4111111111111111',
      expiry: '12/29',
      cvv: '123',
    },
    mastercard: {
      number: '5555555555554444',
      expiry: '12/29',
      cvv: '123',
    },
  },
};

// ─── Configuración Datafast ───
export const DATAFAST_CONFIG = {
  environment: 'uat', // 'uat' o 'prod'
  entityId: 'ENTITY_ID_REPLACE_WITH_YOURS', // Obtén de Datafast
  accessToken: 'TOKEN_REPLACE_WITH_YOURS', // Obtén de Datafast

  // URLs según entorno
  checkoutUrl: 'https://test.oppwa.com/checkout', // UAT
  // checkoutUrl: 'https://oppwa.com/checkout', // PROD

  apiUrl: 'https://test.oppwa.com/v1', // UAT
  // apiUrl: 'https://oppwa.com/v1', // PROD

  testCards: {
    visa: {
      number: '4200000000000000',
      expiry: '12/29',
      cvv: '123',
    },
    mastercard: {
      number: '5105105105105100',
      expiry: '12/29',
      cvv: '123',
    },
  },
};

// ─── Configuración Backend ───
export const BACKEND_CONFIG = {
  // Cambia estas URLs a tu backend real cuando lo tengas
  baseUrl: 'https://tu-api.com', // Reemplaza con tu backend

  endpoints: {
    // Para Kushki
    kushkiCheckout: '/api/payment/kushki/checkout',
    kushkiCharge: '/api/payment/kushki/charge',

    // Para Datafast
    datafastCheckout: '/api/payment/datafast/checkout',
    datafastCharge: '/api/payment/datafast/charge',
  },
};

// ─── Helper para obtener config según proveedor ───
export const getPaymentConfig = () => {
  if (PAYMENT_PROVIDER === 'kushki') {
    return KUSHKI_CONFIG;
  } else {
    return DATAFAST_CONFIG;
  }
};
