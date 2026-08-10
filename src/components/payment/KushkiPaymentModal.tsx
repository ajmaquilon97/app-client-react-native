import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, ActivityIndicator, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Espacio } from '@/types';
import { ArrowLeftIcon } from '@/components/icons';
import PaymentResult from './PaymentResult';
import { makeStyles, useTheme } from '@/theme';

/** Tarjeta de prueba que fuerza un rechazo (para probar el flujo de error). */
const DECLINE_TEST_CARD = '4000000000000002';

type PaymentStatus = 'form' | 'processing' | 'success' | 'error';

export interface KushkiPaymentModalProps {
  visible: boolean;
  espacio: Espacio | null;
  fecha: string;
  cantidad: number;
  total: string;
  reservaId: number | null;
  onClose: () => void;
  onSuccess: (result: { transactionId: string; amount: string; pagoYaRegistrado?: boolean }) => void;
}

const KushkiPaymentModal: React.FC<KushkiPaymentModalProps> = ({
  visible,
  espacio,
  fecha,
  cantidad,
  total,
  onClose,
  onSuccess,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>('form');
  const [transactionId, setTransactionId] = useState<string>('');

  const procesando = status === 'processing';

  // Reinicia el estado cada vez que se abre/cierra el modal
  useEffect(() => {
    if (!visible) {
      setStatus('form');
      setTransactionId('');
      setLoading(false);
    }
  }, [visible]);

  if (!espacio) return null;

  // ─── Genera el HTML con el SDK de Kushki ───
  const generatePaymentHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pago Seguro</title>
        <script src="https://cdn.kushkipagos.com/kushki.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            padding: 20px;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h1 {
            font-size: 18px;
            color: #1e3a5f;
            margin-bottom: 16px;
            font-weight: 700;
          }
          .resumen {
            background: #f9fafb;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #6b7280;
          }
          .resumen-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .resumen-row:last-child {
            margin-bottom: 0;
            color: #1e3a5f;
            font-weight: 600;
          }
          .form-group {
            margin-bottom: 16px;
          }
          label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          input[type="text"],
          input[type="email"],
          input[type="tel"] {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
          }
          input:focus {
            outline: none;
            border-color: #14b8a6;
            box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
          }
          .btn {
            width: 100%;
            padding: 12px;
            background: #1e3a5f;
            color: #14b8a6;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            cursor: pointer;
            margin-top: 16px;
          }
          .btn:hover {
            background: #1a2f4a;
          }
          .btn:disabled {
            background: #d1d5db;
            color: #9ca3af;
            cursor: not-allowed;
          }
          .error {
            color: #ef4444;
            font-size: 12px;
            margin-top: 8px;
          }
          .success {
            color: #10b981;
            font-size: 12px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Pago Seguro 🔒</h1>

          <div class="resumen">
            <div class="resumen-row">
              <span>Espacio:</span>
              <span>${espacio.nombre}</span>
            </div>
            <div class="resumen-row">
              <span>Fecha:</span>
              <span>${fecha}</span>
            </div>
            <div class="resumen-row">
              <span>Cantidad:</span>
              <span>${cantidad} ${espacio.unidad}(s)</span>
            </div>
            <div class="resumen-row">
              <span>Total a pagar:</span>
              <span>$${total}</span>
            </div>
          </div>

          <form id="paymentForm">
            <div class="form-group">
              <label for="cardNumber">Número de Tarjeta</label>
              <input
                type="text"
                id="cardNumber"
                placeholder="4111 1111 1111 1111"
                maxlength="19"
              >
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label for="expiryDate">Vencimiento</label>
                <input
                  type="text"
                  id="expiryDate"
                  placeholder="MM/AA"
                  maxlength="5"
                >
              </div>
              <div class="form-group">
                <label for="cvv">CVV</label>
                <input
                  type="text"
                  id="cvv"
                  placeholder="***"
                  maxlength="3"
                  type="password"
                >
              </div>
            </div>

            <div class="form-group">
              <label for="cardholderName">Titular</label>
              <input
                type="text"
                id="cardholderName"
                placeholder="Nombre tal como aparece en la tarjeta"
              >
            </div>

            <div class="form-group">
              <label for="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                placeholder="correo@ejemplo.com"
              >
            </div>

            <button type="submit" class="btn">
              Pagar $${total}
            </button>

            <div id="message"></div>
          </form>
        </div>

        <script>
          // IMPORTANTE: Estos son valores de PRUEBA (UAT)
          // En producción, obtén el PUBLIC_KEY de tu dashboard Kushki
          const KUSHKI_PUBLIC_KEY = 'PUBLIC_TEST_KEY_DO_NOT_USE_IN_PRODUCTION';
          const KUSHKI_ENVIRONMENT = 'uat'; // Cambiar a 'prod' en producción

          // Inicializar Kushki (esto es para demostración)
          // En producción, necesitarás hacer una llamada a tu backend
          // para obtener una sesión/token de Kushki

          const form = document.getElementById('paymentForm');
          const messageDiv = document.getElementById('message');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const cardNumber = document.getElementById('cardNumber').value;
            const expiryDate = document.getElementById('expiryDate').value;
            const cvv = document.getElementById('cvv').value;
            const cardholderName = document.getElementById('cardholderName').value;
            const email = document.getElementById('email').value;

            // Validación básica
            if (!cardNumber || !expiryDate || !cvv || !cardholderName || !email) {
              showMessage('Por favor completa todos los campos', 'error');
              return;
            }

            // Simular tokenización (en producción, usarías kushki.requestToken())
            try {
              messageDiv.innerHTML = '<div class="success">Procesando pago...</div>';

              // Enviar datos al app nativa para procesamiento
              // El app verificará el token y ejecutará el pago
              const paymentData = {
                cardNumber: cardNumber.replace(/\\s/g, ''),
                expiryMonth: expiryDate.split('/')[0],
                expiryYear: expiryDate.split('/')[1],
                cvv,
                cardholderName,
                email,
                amount: '${total}',
                currency: 'USD'
              };

              // Enviar mensaje a React Native
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: 'PROCESS_PAYMENT',
                  data: paymentData
                })
              );

            } catch (error) {
              showMessage('Error al procesar el pago: ' + error.message, 'error');
            }
          });

          function showMessage(msg, type) {
            messageDiv.innerHTML = \`<div class="\${type}">\${msg}</div>\`;
          }

          // Listener para mensajes desde React Native
          document.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'PAYMENT_SUCCESS') {
              showMessage('¡Pago autorizado! Redirigiendo...', 'success');
            } else if (data.type === 'PAYMENT_ERROR') {
              showMessage('Error: ' + data.message, 'error');
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  // ─── Maneja mensajes del WebView ───
  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'PROCESS_PAYMENT') {
          setStatus('processing');

          // SIMULACIÓN: aquí tu backend procesaría el pago real con Kushki.
          // Por ahora decidimos éxito/fallo según la tarjeta de prueba usada.
          const cardNumber: string = data.data?.cardNumber || '';
          const isDeclined = cardNumber === DECLINE_TEST_CARD;

          setTimeout(() => {
            if (isDeclined) {
              setStatus('error');
            } else {
              setTransactionId(`RES-${Math.floor(100000 + Math.random() * 900000)}`);
              setStatus('success');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error procesando mensaje del WebView:', error);
      }
    },
    []
  );

  // Confirma el pago exitoso → el padre cierra el modal y navega a reservas
  const handleContinue = useCallback(() => {
    onSuccess({ transactionId, amount: total });
  }, [onSuccess, transactionId, total]);

  // Vuelve al formulario de pago para reintentar
  const handleRetry = useCallback(() => {
    setStatus('form');
  }, []);

  // Solo se puede cerrar manualmente en el formulario o tras un error
  const canClose = status === 'form' || status === 'error';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={canClose ? onClose : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!canClose}
            onPress={onClose}
            style={styles.headerBtn}>
            <ArrowLeftIcon
              size={20}
              color={canClose ? colors.surface : colors.textSecondary}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Completar Pago</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* WebView con formulario de pago */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Cargando formulario de pago...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ html: generatePaymentHTML() }}
          onMessage={handleWebViewMessage}
          onLoad={() => setLoading(false)}
          onLoadStart={() => setLoading(true)}
          style={{ flex: 1 }}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={Platform.OS === 'android'}
          showsVerticalScrollIndicator={false}
        />

        {/* Overlay de procesamiento */}
        {procesando && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.processingText}>Procesando pago seguro...</Text>
          </View>
        )}

        {/* Pantalla de resultado: éxito o fallo */}
        {(status === 'success' || status === 'error') && (
          <PaymentResult
            status={status}
            amount={total}
            fecha={fecha}
            transactionId={transactionId}
            onContinue={handleContinue}
            onRetry={handleRetry}
            onCancel={onClose}
          />
        )}
      </View>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    backgroundColor: t.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: t.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  headerBtn: {
    padding: t.spacing.xs,
    backgroundColor: t.colors.overlayWhite,
    borderRadius: t.radius.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: t.colors.textInverse,
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
    marginHorizontal: t.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.background,
  },
  loadingText: {
    marginTop: t.spacing.md,
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.semiBold,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.primaryScrim,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    marginTop: t.spacing.md,
    color: t.colors.accent,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
  },
}));

export default KushkiPaymentModal;
