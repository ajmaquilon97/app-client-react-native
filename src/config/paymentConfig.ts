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

  // IMPORTANTE: este scheme NO debe coincidir con el "scheme" de app.json
  // ("appclientreactnative"). Si coincide, Android/iOS lo resuelven como deep
  // link real del sistema operativo *antes* de que el WebView pueda
  // interceptarlo — abre la app de nuevo por fuera del modal de pago y
  // expo-router muestra "Unmatched Route" porque no existe esa ruta. Usando un
  // scheme inventado que la app no tiene registrado, el sistema no sabe qué
  // hacer con la URL y se la pasa al WebView, que es quien la intercepta en
  // `onShouldStartLoadWithRequest` para leer el `resourcePath`.
  shopperResultUrl: 'datafast-checkout://payment-result',

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

// ─── ⚠️ Diagnóstico temporal: bypass del backend para Datafast ───
//
// Mientras backend arregla la validación de `resourcePath` (ver
// FEEDBACK_BACKEND_DATAFAST.md → "Bug encontrado probando en UAT"), este
// toggle hace que la app llame DIRECTO a Datafast (con el entityId/token
// público de Fase 1) en vez de pasar por nuestro backend — sirve para
// confirmar que Datafast en sí funciona bien.
//
// La reserva NO queda marcada como pagada en nuestra base mientras esto esté
// activo (justamente porque se salta al backend). Es solo para probar.
//
// El `&& __DEV__` es a propósito: aunque alguien cambie el flag a `true` y se
// olvide de revertirlo, en un build de producción (__DEV__ === false) este
// modo queda desactivado igual.
const DATAFAST_DIAGNOSTICO_DIRECTO_UAT_FLAG = true; // ← cambiar a true para probar
export const DATAFAST_DIAGNOSTICO_DIRECTO_UAT = __DEV__ && DATAFAST_DIAGNOSTICO_DIRECTO_UAT_FLAG;

// ─── Helper para obtener config según proveedor ───
export const getPaymentConfig = () => {
  if (PAYMENT_PROVIDER === 'kushki') {
    return KUSHKI_CONFIG;
  } else {
    return DATAFAST_CONFIG;
  }
};
