import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Espacio } from '@/types';
import { ArrowLeftIcon } from '@/components/icons';
import { DATAFAST_CONFIG } from '@/config/paymentConfig';

export interface DatafastPaymentModalProps {
  visible: boolean;
  espacio: Espacio | null;
  fecha: string;
  cantidad: number;
  total: string;
  onClose: () => void;
  onSuccess: (result: { transactionId: string; amount: string }) => void;
}

const DatafastPaymentModal: React.FC<DatafastPaymentModalProps> = ({
  visible,
  espacio,
  fecha,
  cantidad,
  total,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

  if (!espacio) return null;

  // ─── Genera el HTML con formulario de pago (similar a Kushki) ───
  const generatePaymentHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pago Seguro Datafast</title>
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
          .badge {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            margin-left: 8px;
            text-transform: uppercase;
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
          .info-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            color: #92400e;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Pago Seguro <span class="badge">Datafast</span></h1>

          <div class="info-box">
            <strong>⚠️ Entorno de prueba:</strong> Usa las tarjetas de prueba proporcionadas
          </div>

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
                placeholder="4200 0000 0000 0000"
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
                  type="password"
                  id="cvv"
                  placeholder="***"
                  maxlength="3"
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
              Pagar $${total} con Datafast
            </button>

            <div id="message"></div>
          </form>
        </div>

        <script>
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

            try {
              messageDiv.innerHTML = '<div class="success">Procesando pago con Datafast...</div>';

              // Enviar datos al app nativa
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
          setProcesando(true);

          // Simular procesamiento con Datafast
          // En producción, aquí llamarías a tu backend
          setTimeout(() => {
            setProcesando(false);

            // Simular éxito
            onSuccess({
              transactionId: `DATAFAST-${Date.now()}`,
              amount: total,
            });
          }, 2000);
        }
      } catch (error) {
        console.error('Error procesando mensaje del WebView:', error);
      }
    },
    [total, onSuccess]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={procesando ? undefined : onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={procesando}
            onPress={onClose}
            style={styles.headerBtn}>
            <ArrowLeftIcon
              size={20}
              color={procesando ? Colors.gray500 : Colors.white}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pago Datafast</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* WebView con formulario de pago */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accentTeal} />
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
            <ActivityIndicator size="large" color={Colors.accentTeal} />
            <Text style={styles.processingText}>Procesando con Datafast...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  headerBtn: {
    padding: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    marginHorizontal: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.gray600,
    fontWeight: FontWeight.semiBold,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 58, 95, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    marginTop: Spacing.md,
    color: Colors.accentTeal,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

export default DatafastPaymentModal;
