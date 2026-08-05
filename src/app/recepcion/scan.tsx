import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { useKioskAuth } from '@/context/KioskAuthContext';
import { validarQr } from '@/services/recepcion.service';
import { ApiError } from '@/services/apiError';

type Resultado =
  | { tipo: 'success'; nombre: string }
  | { tipo: 'notfound' | 'used'; mensaje: string };

const AUTO_DISMISS_MS = 2000;

export default function RecepcionScanScreen() {
  const insets = useSafeAreaInsets();
  useKeepAwake();
  const { fetchAuthorizedKiosk, logoutKiosk } = useKioskAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const procesandoRef = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

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

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accentTeal} size="large" />
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

  const escaneoActivo = !resultado && !procesando;

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={escaneoActivo ? handleBarcodeScanned : undefined}
      />

      {procesando && !resultado && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator color={Colors.white} size="large" />
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

      <View style={[styles.manualBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TextInput
          value={codigoManual}
          onChangeText={setCodigoManual}
          placeholder="Código corto (6 caracteres)"
          placeholderTextColor={Colors.gray400}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  camera: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  permissionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
  },
  permissionBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  permissionBtnText: {
    color: Colors.accentTeal,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  resultSuccess: {
    backgroundColor: Colors.success,
  },
  resultError: {
    backgroundColor: Colors.error,
  },
  resultWarning: {
    backgroundColor: Colors.warning,
  },
  resultIcon: {
    fontSize: 64,
    color: Colors.white,
    fontWeight: FontWeight.extraBold,
  },
  resultNombre: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.white,
    textAlign: 'center',
  },
  resultSubtext: {
    fontSize: FontSize.base,
    color: Colors.white,
  },
  resultMensaje: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  resultTapText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: Spacing.md,
  },
  manualBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  manualInput: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.white,
    color: Colors.textPrimary,
    fontSize: FontSize.base,
  },
  manualBtn: {
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnDisabled: {
    opacity: 0.5,
  },
  manualBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
  },
});
