/**
 * Configuración de Pasarelas de Pago
 * Cambia PAYMENT_PROVIDER para hacer pruebas con Kushki o Datafast
 */

export type PaymentProvider = 'kushki' | 'datafast';

// ─── CAMBIAR AQUÍ PARA HACER PRUEBAS ───
export const PAYMENT_PROVIDER: PaymentProvider = 'datafast'; // ← 'kushki' o 'datafast'

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
//
// IMPORTANTE: entityId y accessToken son credenciales secretas del comercio.
// NUNCA deben vivir en el cliente (se podrían extraer del APK/IPA y usarse para
// cargos fraudulentos). Crear el checkout (POST /v1/checkouts) y verificar el
// pago (GET /v1/checkouts/{id}/payment) son operaciones que solo el backend
// puede hacer — ver FEEDBACK_BACKEND_DATAFAST.md para el contrato exacto que
// necesitamos que exponga.
//
// Lo único que el cliente necesita es el dominio público del widget de pago
// (Copy&Pay) y a dónde debe "redirigir" tras el pago.
export const DATAFAST_CONFIG = {
  environment: 'uat', // 'uat' o 'prod'

  widgetBaseUrl: 'https://test.oppwa.com', // UAT
  // widgetBaseUrl: 'https://oppwa.com', // PROD

  // Debe coincidir con el "scheme" definido en app.json. El WebView intercepta
  // la navegación a esta URL (nunca llega a cargarla de verdad) para extraer
  // el `resourcePath` que Datafast agrega como query param.
  shopperResultUrl: 'appclientreactnative://payment-result',

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

// ─── Helper para obtener config según proveedor ───
export const getPaymentConfig = () => {
  if (PAYMENT_PROVIDER === 'kushki') {
    return KUSHKI_CONFIG;
  } else {
    return DATAFAST_CONFIG;
  }
};
