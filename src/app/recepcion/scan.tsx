import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, BackHandler } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKioskAuth, validarQr } from '@/features/recepcion';
import { ApiError } from '@/shared/api/errors';
import { makeStyles, spacing, useTheme } from '@/shared/theme';

type Resultado =
  | { tipo: 'success'; nombre: string }
  | { tipo: 'notfound' | 'used'; mensaje: string };

const AUTO_DISMISS_MS = 2000;

export default function RecepcionScanScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useKeepAwake();
  const { fetchAuthorizedKiosk, logoutKiosk } = useKioskAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [camaraActiva, setCamaraActiva] = useState(false);
  const procesandoRef = useRef(false);

  /**
   * El botón físico de atrás nunca cierra el modo kiosco (eso solo lo hace
   * "Salir", con confirmación). Pero si la cámara está encendida, sí sirve
   * para apagarla y volver al menú, que es lo que la gente espera al
   * presionarlo.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (camaraActiva) {
        setCamaraActiva(false);
      }
      return true;
    });
    return () => sub.remove();
  }, [camaraActiva]);

  const handleCodigo = useCallback(
    async (codigo: string) => {
      const codigoLimpio = codigo.trim();
      if (!codigoLimpio || procesandoRef.current || resultado) return;

      procesandoRef.current = true;
      setProcesando(true);
      try {
        const data = await fetchAuthorizedKiosk(token => validarQr(codigoLimpio, token));
        setResultado({ tipo: 'success', nombre: data.nombre });
        setTimeout(() => setResultado(null), AUTO_DISMISS_MS);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          Alert.alert('Sesión expirada', err.message || 'La sesión de kiosco ha expirado. Vuelve a ingresar el PIN.', [
            { text: 'Entendido', onPress: () => logoutKiosk() },
          ]);
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setResultado({ tipo: 'notfound', mensaje: err.message });
          return;
        }
        if (err instanceof ApiError && err.status === 409) {
          setResultado({ tipo: 'used', mensaje: err.message });
          return;
        }
        Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo validar el código.', [
          { text: 'Entendido' },
        ]);
      } finally {
        procesandoRef.current = false;
        setProcesando(false);
        setCodigoManual('');
      }
    },
    [fetchAuthorizedKiosk, logoutKiosk, resultado],
  );

  const handleBarcodeScanned = useCallback(
    (event: { data: string }) => {
      handleCodigo(event.data);
    },
    [handleCodigo],
  );

  const cerrarResultado = () => setResultado(null);

  const volverAlMenu = useCallback(() => setCamaraActiva(false), []);

  /**
   * Única salida del modo kiosco. Sin esto la pantalla es un callejón sin
   * salida: el gesto de retroceso está desactivado y la sesión sobrevive al
   * cierre de la app, así que solo se salía esperando a que el PIN caducara.
   *
   * Va con confirmación porque el dispositivo está en la puerta, al alcance de
   * los invitados, y volver a entrar exige pedirle el PIN al anfitrión.
   */
  const confirmarSalida = useCallback(() => {
    Alert.alert(
      'Salir del modo recepción',
      'Se cerrará la sesión de kiosco. Para volver a validar entradas necesitarás el PIN del anfitrión.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => logoutKiosk() },
      ],
    );
  }, [logoutKiosk]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.permissionTitle}>Necesitamos acceso a la cámara</Text>
        <Text style={styles.permissionText}>
          El modo kiosco usa la cámara para escanear las entradas de los invitados en la puerta.
        </Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Dar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const escaneoActivo = camaraActiva && !resultado && !procesando;

  return (
    <View style={styles.container}>
      {camaraActiva ? (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={escaneoActivo ? handleBarcodeScanned : undefined}
        />
      ) : (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Validar entrada</Text>
          <Text style={styles.menuSubtitle}>
            Escanea el código QR de la entrada o ingresa el código corto abajo.
          </Text>
          <TouchableOpacity activeOpacity={0.85} style={styles.qrBtn} onPress={() => setCamaraActiva(true)}>
            <Text style={styles.qrBtnText}>Escanear código QR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sobre la cámara, discreto: son acciones del anfitrión, no del flujo
          de validación. Los overlays de resultado lo tapan a propósito. */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        {camaraActiva ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={volverAlMenu}
            accessibilityRole="button"
            accessibilityLabel="Volver y apagar la cámara"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Volver</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={confirmarSalida}
          accessibilityRole="button"
          accessibilityLabel="Salir del modo recepción"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.exitBtn}>
          <Text style={styles.exitBtnText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {procesando && !resultado && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator color={colors.textInverse} size="large" />
        </View>
      )}

      {resultado?.tipo === 'success' && (
        <View style={[styles.resultOverlay, styles.resultSuccess]}>
          <Text style={styles.resultIcon}>✓</Text>
          <Text style={styles.resultNombre}>{resultado.nombre}</Text>
          <Text style={styles.resultSubtext}>Ingreso registrado</Text>
        </View>
      )}

      {resultado?.tipo === 'notfound' && (
        <TouchableOpacity activeOpacity={0.9} style={[styles.resultOverlay, styles.resultError]} onPress={cerrarResultado}>
          <Text style={styles.resultIcon}>✕</Text>
          <Text style={styles.resultMensaje}>{resultado.mensaje}</Text>
          <Text style={styles.resultTapText}>Toca para volver a escanear</Text>
        </TouchableOpacity>
      )}

      {resultado?.tipo === 'used' && (
        <TouchableOpacity activeOpacity={0.9} style={[styles.resultOverlay, styles.resultWarning]} onPress={cerrarResultado}>
          <Text style={styles.resultIcon}>⚠</Text>
          <Text style={styles.resultMensaje}>{resultado.mensaje}</Text>
          <Text style={styles.resultTapText}>Toca para volver a escanear</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.manualBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          value={codigoManual}
          onChangeText={setCodigoManual}
          placeholder="Código corto (6 caracteres)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={6}
          style={styles.manualInput}
          editable={!procesando}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.manualBtn, (procesando || !codigoManual) && styles.manualBtnDisabled]}
          disabled={procesando || !codigoManual}
          onPress={() => handleCodigo(codigoManual)}>
          <Text style={styles.manualBtnText}>Validar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.textPrimary,
  },
  camera: {
    flex: 1,
  },
  menu: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.spacing.xl,
    gap: t.spacing.md,
  },
  menuTitle: {
    fontSize: t.fontSize.xl,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.textInverse,
    textAlign: 'center',
  },
  menuSubtitle: {
    fontSize: t.fontSize.sm,
    color: t.colors.textOnMedia,
    textAlign: 'center',
  },
  qrBtn: {
    marginTop: t.spacing.md,
    width: '100%',
    alignItems: 'center',
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.xl,
  },
  qrBtnText: {
    color: t.colors.textInverse,
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.extraBold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.background,
    padding: t.spacing.xl,
    gap: t.spacing.sm,
  },
  permissionTitle: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  permissionBtn: {
    marginTop: t.spacing.md,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.xl,
  },
  permissionBtnText: {
    color: t.colors.accent,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.md,
  },
  backBtn: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.overlay,
  },
  backBtnText: {
    color: t.colors.textInverse,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
  },
  exitBtn: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.overlay,
  },
  exitBtnText: {
    color: t.colors.textInverse,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.overlay,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.xl,
  },
  resultSuccess: {
    backgroundColor: t.colors.success,
  },
  resultError: {
    backgroundColor: t.colors.error,
  },
  resultWarning: {
    backgroundColor: t.colors.warning,
  },
  resultIcon: {
    fontSize: 64,
    color: t.colors.textInverse,
    fontWeight: t.fontWeight.extraBold,
  },
  resultNombre: {
    fontSize: t.fontSize.xxl,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.textInverse,
    textAlign: 'center',
  },
  resultSubtext: {
    fontSize: t.fontSize.base,
    color: t.colors.textInverse,
  },
  resultMensaje: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textInverse,
    textAlign: 'center',
  },
  resultTapText: {
    fontSize: t.fontSize.sm,
    color: t.colors.textOnMedia,
    marginTop: t.spacing.md,
  },
  manualBar: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    padding: t.spacing.sm,
    backgroundColor: t.colors.overlay,
  },
  manualInput: {
    flex: 1,
    height: 44,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.sm,
    backgroundColor: t.colors.surface,
    color: t.colors.textPrimary,
    fontSize: t.fontSize.base,
  },
  manualBtn: {
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnDisabled: {
    opacity: 0.5,
  },
  manualBtnText: {
    color: t.colors.textInverse,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
  },
}));
