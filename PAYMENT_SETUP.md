# 🔧 Guía de Configuración de Pasarelas de Pago

Este documento explica cómo configurar y hacer pruebas con **Kushki** o **Datafast**.

---

## 🚀 Cambiar entre Kushki y Datafast (FÁCIL)

### Paso 1: Abre el archivo de configuración
```
src/config/paymentConfig.ts
```

### Paso 2: Cambia la línea 10
**Para usar Kushki:**
```typescript
export const PAYMENT_PROVIDER: PaymentProvider = 'kushki';
```

**Para usar Datafast:**
```typescript
export const PAYMENT_PROVIDER: PaymentProvider = 'datafast';
```

### Paso 3: ¡Listo!
La app automáticamente usará la pasarela que elegiste. No necesitas cambiar nada más.

---

## 🧪 Pruebas con Tarjetas de Prueba

### Tarjetas Kushki (UAT)
```
VISA (aprobada)
- Número: 4111 1111 1111 1111
- Vencimiento: 12/29 (o cualquiera futuro)
- CVV: 123 (o cualquier número)

Mastercard (aprobada)
- Número: 5555 5555 5555 4444
- Vencimiento: 12/29
- CVV: 123
```

### Tarjetas Datafast (UAT)
```
VISA (aprobada)
- Número: 4200 0000 0000 0000
- Vencimiento: 12/29
- CVV: 123

Mastercard (aprobada)
- Número: 5105 1051 0510 5100
- Vencimiento: 12/29
- CVV: 123
```

### 🔴 Tarjeta de RECHAZO (para probar el flujo de error)
```
Cualquier pasarela
- Número: 4000 0000 0000 0002
- Vencimiento: 12/29
- CVV: 123
```
Con esta tarjeta verás la pantalla de **Pago Rechazado** y podrás reintentar.
Con cualquier otra tarjeta el pago se aprueba y te redirige a **Calendario** (Mis Reservas).

---

## 📋 Configuración Detallada por Pasarela

### Kushki

#### 1. Obtén tus credenciales
- Regístrate en [kushkipagos.com](https://www.kushkipagos.com)
- Ve a **Dashboard → Configuración → API Keys**
- Copia tu **PUBLIC_KEY**

#### 2. Actualiza paymentConfig.ts
```typescript
export const KUSHKI_CONFIG = {
  publicKey: 'YOUR_ACTUAL_PUBLIC_KEY_HERE', // ← Reemplaza
  // ... resto igual
};
```

#### 3. Configura tu backend (cuando lo tengas)
Tu backend necesita un endpoint `/api/payment/kushki/charge` que:
```typescript
POST /api/payment/kushki/charge
{
  "cardData": {
    "number": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "29",
    "cvv": "123",
    "cardholderName": "NOMBRE"
  },
  "amount": "50.00",
  "currency": "USD"
}

// Respuesta esperada
{
  "success": true,
  "transactionId": "TRANS-123456",
  "amount": "50.00"
}
```

---

### Datafast

#### 1. Obtén tus credenciales
- Contacta a Datafast o regístrate en [developers.datafast.com.ec](https://developers.datafast.com.ec)
- Ve a tu panel y obtén:
  - **Entity ID** (ENTITY_ID)
  - **Access Token** (TOKEN)

#### 2. Actualiza paymentConfig.ts
```typescript
export const DATAFAST_CONFIG = {
  entityId: 'YOUR_ENTITY_ID_HERE',      // ← Reemplaza
  accessToken: 'YOUR_TOKEN_HERE',        // ← Reemplaza
  // ... resto igual
};
```

#### 3. Configura tu backend
Tu backend necesita estos endpoints:

**a) Crear checkout:**
```typescript
POST /api/payment/datafast/checkout
{
  "amount": "50.00",
  "currency": "USD",
  "espacio_id": 1,
  "fecha_reserva": "2025-12-25"
}

// Respuesta esperada
{
  "checkoutId": "CHK-ABC123"
}
```

**b) Procesar pago:**
```typescript
POST /api/payment/datafast/charge
{
  "checkoutId": "CHK-ABC123",
  "cardData": {
    "number": "4200000000000000",
    "expiryMonth": "12",
    "expiryYear": "29",
    "cvv": "123",
    "cardholderName": "NOMBRE"
  }
}

// Respuesta esperada
{
  "success": true,
  "transactionId": "DATAFAST-XYZ",
  "resultCode": "000.100.110"
}
```

---

## 🔄 Flujo Actual (Simulado)

Por ahora, **ambas pasarelas simulan el pago** sin llamar a un backend real. Cuando presionas "Pagar":

1. ✅ Se muestra el formulario en WebView
2. ✅ Escribes datos de tarjeta
3. ✅ Presionas "Pagar"
4. ⏳ Espera 2 segundos (simulación)
5. La pantalla de resultado depende de la tarjeta:
   - **Aprobada** → pantalla verde "¡Pago Autorizado!" → se guarda la reserva → redirige a **Calendario**
   - **Rechazada** (`4000 0000 0000 0002`) → pantalla "Pago Rechazado" → botón **Reintentar** (vuelve al formulario) o **Cancelar**

> La decisión éxito/fallo se simula según el número de tarjeta en `KushkiPaymentModal.tsx` /
> `DatafastPaymentModal.tsx` (constante `DECLINE_TEST_CARD`). En producción, esto lo decide la
> respuesta de tu backend.

### ¿Dónde se guardan las reservas?
Al aprobarse el pago, la reserva se agrega vía `ReservationsContext` y aparece en la pestaña
**Calendario** (`src/app/calendario.tsx`), donde puedes verla y cancelarla. Este estado vive en
memoria; se pierde al cerrar la app (más adelante se puede persistir con AsyncStorage o backend).

**Para activar pagos reales**, necesitas:
- Backend con los endpoints descritos arriba
- Actualizar `KushkiPaymentModal.tsx` / `DatafastPaymentModal.tsx` línea ~130 para llamar a tu backend en lugar de simular

---

## 🧑‍💻 Próximos Pasos (Implementación Real)

### Opción A: Usar tu propio backend (recomendado)
1. Crea los endpoints `/api/payment/kushki/charge` o `/api/payment/datafast/charge`
2. Usa el SDK oficial de Kushki/Datafast en tu backend
3. Actualiza `BACKEND_CONFIG.baseUrl` en `paymentConfig.ts`
4. Descomena la sección de "llamada real" en los modales

### Opción B: Usar un servicio de terceros
- Stripe (no disponible en Ecuador)
- MercadoPago (requiere documentación específica)
- Otros procesadores locales

---

## 📝 Estructura de Archivos

```
src/
├── components/
│   └── payment/
│       ├── PaymentModal.tsx          ← Selector automático (Kushki o Datafast)
│       ├── KushkiPaymentModal.tsx    ← Modal Kushki (WebView)
│       ├── DatafastPaymentModal.tsx  ← Modal Datafast (WebView)
│       └── PaymentResult.tsx         ← Pantalla de éxito/fallo (compartida)
│
├── config/
│   └── paymentConfig.ts              ← Configuración centralizada
│
├── context/
│   └── ReservationsContext.tsx       ← Estado global de reservas
│
├── app/
│   └── calendario.tsx                ← Pestaña "Mis Reservas"
│
└── components/space/
    └── SpaceDetailSheet.tsx          ← Usa PaymentModal + guarda reserva + navega
```

---

## 🐛 Solución de Problemas

### Q: El formulario de pago no aparece
**A:** Verifica que `react-native-webview` esté instalado:
```bash
npm list react-native-webview
```

Si no está, instala:
```bash
npm install react-native-webview
```

### Q: Cambia entre Kushki y Datafast pero sigue mostrando lo antiguo
**A:** Recarga la app completamente. En Expo:
- Android: Presiona `r` en la terminal
- iOS: Presiona `r` en la terminal o recarga desde el simulador

### Q: ¿Cómo veo qué pasarela está activa?
**A:** Mira el título del modal:
- "Completar Pago" → Kushki
- "Pago Datafast" → Datafast

---

## 📞 Contactos Útiles

**Kushki:**
- Docs: https://docs.kushki.com
- Support: integraciones@kushkipagos.com

**Datafast:**
- Docs: https://developers.datafast.com.ec
- Teléfono: +593 95 909 8900

---

**Última actualización:** Mayo 2025  
**Estado:** Simulado (listo para integración real)
