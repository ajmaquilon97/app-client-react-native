import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Espacio } from '@/types';
import { ArrowLeftIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { DATAFAST_CONFIG, DATAFAST_DIAGNOSTICO_DIRECTO_UAT } from '@/config/paymentConfig';
import { crearCheckoutDatafast, verificarPagoDatafast } from '@/services/datafast.service';
import {
  crearCheckoutDatafastDirecto,
  verificarPagoDatafastDirecto,
  registrarTransaccionDirecta,
  UAT_DIRECT_WIDGET_BASE_URL,
} from '@/services/datafastDirectUat';
import PaymentResult from './PaymentResult';

type PaymentStatus = 'loading-checkout' | 'widget' | 'verifying' | 'success' | 'error';

export interface DatafastPaymentModalProps {
  visible: boolean;
  espacio: Espacio | null;
  fecha: string;
  cantidad: number;
  total: string;
  reservaId: number | null;
  onClose: () => void;
  onSuccess: (result: { transactionId: string; amount: string; pagoYaRegistrado?: boolean }) => void;
}

function extractResourcePath(url: string): string | null {
  const match = url.match(/[?&]resourcePath=([^&]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

const DatafastPaymentModal: React.FC<DatafastPaymentModalProps> = ({
  visible,
  espacio,
  fecha,
  total,
  reservaId,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { fetchAuthorized } = useAuth();
  const requestIdRef = useRef(0);
  const resultHandledRef = useRef(false);

  const [status, setStatus] = useState<PaymentStatus>('loading-checkout');
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [transactionId, setTransactionId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const canClose = status === 'widget' || status === 'error';

  const iniciarCheckout = useCallback(async () => {
    if (!espacio || reservaId == null) return;
    const requestId = ++requestIdRef.current;
    setStatus('loading-checkout');
    setErrorMessage(undefined);
    setCheckoutId(null);

    try {
      const { checkoutId: nuevoCheckoutId } = DATAFAST_DIAGNOSTICO_DIRECTO_UAT
        ? await crearCheckoutDatafastDirecto(total)
        : await fetchAuthorized(accessToken => crearCheckoutDatafast(reservaId, accessToken));
      if (requestIdRef.current !== requestId) return;
      resultHandledRef.current = false;
      setCheckoutId(nuevoCheckoutId);
      setWebViewLoading(true);
      setStatus('widget');
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo iniciar el pago con Datafast.');
      setStatus('error');
    }
  }, [espacio, reservaId, total, fetchAuthorized]);

  // Al abrir el modal, crea un checkout nuevo. Al cerrarlo, invalida cualquier
  // request en vuelo para que no pise el estado si se reabre con otra reserva.
  useEffect(() => {
    if (visible) {
      iniciarCheckout();
    } else {
      requestIdRef.current += 1;
      setStatus('loading-checkout');
      setCheckoutId(null);
      setTransactionId('');
      setErrorMessage(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const verificarPago = useCallback(
    async (resourcePath: string) => {
      if (reservaId == null) return;
      setStatus('verifying');
      try {
        const resultado = DATAFAST_DIAGNOSTICO_DIRECTO_UAT
          ? await verificarPagoDatafastDirecto(resourcePath)
          : await fetchAuthorized(accessToken =>
              verificarPagoDatafast(reservaId, resourcePath, accessToken),
            );
        if (resultado.aprobado) {
          setTransactionId(resultado.transactionId);
          if (DATAFAST_DIAGNOSTICO_DIRECTO_UAT) {
            registrarTransaccionDirecta(reservaId, resultado.transactionId, total);
          }
          setStatus('success');
        } else {
          setErrorMessage(resultado.mensaje || 'El pago fue rechazado.');
          setStatus('error');
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'No se pudo verificar el pago.');
        setStatus('error');
      }
    },
    [reservaId, total, fetchAuthorized],
  );

  // El widget de Datafast intenta "navegar" a shopperResultUrl al terminar.
  // Nunca dejamos que esa navegación ocurra de verdad (es una URL con un scheme
  // inventado, no una página real) — solo la usamos para leer el resourcePath.
  // `resultHandledRef` evita procesarla dos veces: en Android, tras un POST/
  // redirect del formulario del widget, `onShouldStartLoadWithRequest` no
  // siempre dispara de forma confiable, así que además escuchamos
  // `onNavigationStateChange` como respaldo — cualquiera de los dos que llegue
  // primero gana.
  const handleResultUrl = useCallback(
    (url: string) => {
      if (!url.startsWith(DATAFAST_CONFIG.shopperResultUrl) || resultHandledRef.current) {
        return;
      }
      resultHandledRef.current = true;
      const resourcePath = extractResourcePath(url);
      if (resourcePath) {
        verificarPago(resourcePath);
      } else {
        setErrorMessage('No se recibió una respuesta válida de Datafast.');
        setStatus('error');
      }
    },
    [verificarPago],
  );

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      if (request.url.startsWith(DATAFAST_CONFIG.shopperResultUrl)) {
        handleResultUrl(request.url);
        return false;
      }
      return true;
    },
    [handleResultUrl],
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (navState.url) handleResultUrl(navState.url);
    },
    [handleResultUrl],
  );

  const handleContinue = useCallback(() => {
    // En modo diagnóstico directo nos saltamos el backend, así que la reserva
    // NO quedó registrada como pagada ahí — no podemos afirmar lo contrario.
    onSuccess({
      transactionId,
      amount: total,
      pagoYaRegistrado: !DATAFAST_DIAGNOSTICO_DIRECTO_UAT,
    });
  }, [onSuccess, transactionId, total]);

  const handleRetry = useCallback(() => {
    iniciarCheckout();
  }, [iniciarCheckout]);

  if (!espacio || reservaId == null) return null;

  const widgetBaseUrl = DATAFAST_DIAGNOSTICO_DIRECTO_UAT
    ? UAT_DIRECT_WIDGET_BASE_URL
    : DATAFAST_CONFIG.widgetBaseUrl;

  const generateWidgetHTML = (id: string) => `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pago Seguro Datafast</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f7fa;
          padding: 16px;
        }
        .wpwl-form {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .wpwl-button-pay {
          background: #1e3a5f !important;
          color: #14b8a6 !important;
        }
      </style>
      <script src="${widgetBaseUrl}/v1/paymentWidgets.js?checkoutId=${id}"></script>
    </head>
    <body>
      <form action="${DATAFAST_CONFIG.shopperResultUrl}" class="paymentWidgets" data-brands="VISA MASTER"></form>
    </body>
    </html>
  `;

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
              color={canClose ? Colors.white : Colors.gray500}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pago Datafast (UAT)</Text>
          <View style={{ width: 36 }} />
        </View>

        {DATAFAST_DIAGNOSTICO_DIRECTO_UAT && (
          <View style={styles.diagnosticoBanner}>
            <Text style={styles.diagnosticoBannerText}>
              ⚠️ MODO DIAGNÓSTICO — Datafast directo, sin backend. La reserva NO va a quedar pagada en el
              sistema.
            </Text>
          </View>
        )}

        {(status === 'loading-checkout' || (status === 'widget' && webViewLoading)) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accentTeal} />
            <Text style={styles.loadingText}>
              {status === 'loading-checkout'
                ? 'Iniciando pago con Datafast…'
                : 'Cargando formulario de pago…'}
            </Text>
          </View>
        )}

        {checkoutId && (status === 'widget' || status === 'verifying') && (
          <WebView
            source={{ html: generateWidgetHTML(checkoutId) }}
            originWhitelist={['https://*', `${DATAFAST_CONFIG.shopperResultUrl.split('://')[0]}://*`]}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onNavigationStateChange={handleNavigationStateChange}
            onLoad={() => setWebViewLoading(false)}
            onLoadStart={() => setWebViewLoading(true)}
            style={{ flex: 1 }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit={Platform.OS === 'android'}
            showsVerticalScrollIndicator={false}
          />
        )}

        {status === 'verifying' && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={Colors.accentTeal} />
            <Text style={styles.processingText}>Verificando el pago con Datafast…</Text>
          </View>
        )}

        {(status === 'success' || status === 'error') && (
          <PaymentResult
            status={status}
            amount={total}
            fecha={fecha}
            transactionId={transactionId}
            errorMessage={errorMessage}
            onContinue={handleContinue}
            onRetry={handleRetry}
            onCancel={onClose}
          />
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
  diagnosticoBanner: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  diagnosticoBannerText: {
    color: Colors.black,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
