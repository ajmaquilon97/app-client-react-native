import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { ArrowLeftIcon, LocationIcon, CalendarIcon } from '@/components/icons';
import { useReservaDetalle } from '@/hooks/useReservaDetalle';
import { useFacturasReserva } from '@/hooks/useFacturasReserva';
import { useEspacios } from '@/hooks/useEspacios';
import { useAuth } from '@/context/AuthContext';
import { descargarFactura } from '@/services/reservas.service';
import LocationMap from '@/components/space/LocationMap';
import { formatRangoReserva } from '@/utils/fechas';
import { getModalidadReserva } from '@/utils/espacioArchetype';
import { EstadoPago, EstadoReserva, FacturaStatus } from '@/types';

const IMAGEN_FALLBACK =
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';

const ESTADO_RESERVA_LABEL: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  reagendada: 'Reagendada',
  cancelada: 'Cancelada',
  finalizada: 'Finalizada',
};

const ESTADO_RESERVA_COLOR: Record<EstadoReserva, string> = {
  pendiente: Colors.amber,
  confirmada: Colors.accentTeal,
  reagendada: Colors.accentTeal,
  cancelada: Colors.gray400,
  finalizada: Colors.gray400,
};

const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pendiente: 'Pago pendiente',
  pagado_parcialmente: 'Pagado parcialmente',
  pagado: 'Pagado',
  reembolsado: 'Reembolsado',
};

const ESTADO_PAGO_COLOR: Record<EstadoPago, string> = {
  pendiente: Colors.amber,
  pagado_parcialmente: Colors.amber,
  pagado: Colors.success,
  reembolsado: Colors.gray400,
};

// El swagger no publica los valores exactos de `tipoFactura` — solo indica que
// distingue "fee de la plataforma" de "alquiler del espacio" (ver
// GET /api/reservas/{id}/factura). Mapeo best-effort por palabras clave, con el
// valor crudo del backend como respaldo si no calza con ninguna.
function tipoFacturaLabel(tipo: string | null): string {
  if (!tipo) return 'Factura';
  const lower = tipo.toLowerCase();
  if (lower.includes('fee') || lower.includes('comision') || lower.includes('plataforma')) {
    return 'Fee de la plataforma';
  }
  if (lower.includes('alquiler') || lower.includes('espacio') || lower.includes('renta')) {
    return 'Alquiler del espacio';
  }
  return tipo;
}

const ESTADO_FACTURA_COLOR: Record<string, string> = {
  Procesando: Colors.amber,
  Recibida: Colors.amber,
  Autorizada: Colors.success,
  Devuelta: Colors.error,
  'No autorizada': Colors.error,
  Error: Colors.error,
};

function estadoFacturaColor(estado: string): string {
  return ESTADO_FACTURA_COLOR[estado] ?? Colors.gray400;
}

function formatFechaHora(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FacturaCard({ reservaId, factura }: { reservaId: number; factura: FacturaStatus }) {
  const { fetchAuthorized } = useAuth();
  const [descargando, setDescargando] = useState(false);
  const autorizada = factura.estado === 'Autorizada';

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      // Se pide fresco en cada tap: las URLs son pre-firmadas y expiran en 1 hora
      // (urlsExpiranEnSegundos), así que no se pueden cachear del lado del cliente.
      const respuesta = await fetchAuthorized(accessToken => descargarFactura(reservaId, accessToken));
      const item = respuesta.facturas?.find(f => f.tipoFactura === factura.tipoFactura) ?? respuesta.facturas?.[0];
      if (!item?.pdfUrl) {
        Alert.alert(
          'Comprobante no disponible',
          'Todavía no hay un PDF disponible para esta factura. Intenta de nuevo en unos minutos.',
          [{ text: 'Entendido' }],
        );
        return;
      }
      await Linking.openURL(item.pdfUrl);
    } catch (err) {
      Alert.alert(
        'No se pudo descargar la factura',
        err instanceof Error ? err.message : 'Intenta de nuevo.',
        [{ text: 'Entendido' }],
      );
    } finally {
      setDescargando(false);
    }
  };

  return (
    <View style={styles.facturaCard}>
      <View style={styles.facturaHeader}>
        <Text style={styles.facturaTipo}>{tipoFacturaLabel(factura.tipoFactura)}</Text>
        <View style={[styles.facturaEstadoBadge, { backgroundColor: estadoFacturaColor(factura.estado) }]}>
          <Text style={styles.facturaEstadoText}>{factura.estado}</Text>
        </View>
      </View>

      {!!factura.numeroComprobante && (
        <View style={styles.facturaRow}>
          <Text style={styles.facturaLabel}>N.º de comprobante</Text>
          <Text style={styles.facturaValue}>{factura.numeroComprobante}</Text>
        </View>
      )}
      {!!factura.claveAcceso && (
        <View style={styles.facturaRow}>
          <Text style={styles.facturaLabel}>Clave de acceso</Text>
          <Text style={styles.facturaValue} numberOfLines={1}>
            {factura.claveAcceso}
          </Text>
        </View>
      )}
      {!!formatFechaHora(factura.fechaEmision) && (
        <View style={styles.facturaRow}>
          <Text style={styles.facturaLabel}>Emitida</Text>
          <Text style={styles.facturaValue}>{formatFechaHora(factura.fechaEmision)}</Text>
        </View>
      )}
      {factura.total != null && (
        <View style={styles.facturaRow}>
          <Text style={styles.facturaLabel}>Total</Text>
          <Text style={styles.facturaValueBold}>${factura.total.toFixed(2)}</Text>
        </View>
      )}
      {!!factura.motivoRechazo && (
        <Text style={styles.facturaMotivo}>⚠️ {factura.motivoRechazo}</Text>
      )}
      {autorizada && (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={descargando}
          style={[styles.facturaPdfBtn, descargando && styles.facturaPdfBtnDisabled]}
          onPress={handleDescargar}>
          {descargando ? (
            <ActivityIndicator size="small" color={Colors.accentTeal} />
          ) : (
            <Text style={styles.facturaPdfBtnText}>Descargar factura</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ReservaDetalleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, titulo } = useLocalSearchParams<{ id: string; titulo?: string }>();
  const reservaId = Number(id);

  const { data: reserva, isLoading, isError, refetch } = useReservaDetalle(reservaId);
  const { data: espacios = [] } = useEspacios();
  const {
    data: facturas = [],
    isLoading: isLoadingFacturas,
    isError: isErrorFacturas,
    refetch: refetchFacturas,
  } = useFacturasReserva(reservaId);

  const espacio = useMemo(
    () => espacios.find(e => e.id === reserva?.espacioId),
    [espacios, reserva],
  );

  const esCupoCompartido = espacio && getModalidadReserva(espacio) === 'cupo_compartido';

  const espacioCoords = useMemo(() => {
    if (!espacio || espacio.latitud == null || espacio.longitud == null) return null;
    return { latitude: espacio.latitud, longitude: espacio.longitud };
  }, [espacio]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeftIcon size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {reserva?.espacioTitulo ?? titulo ?? 'Detalle de tu reserva'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.accentTeal} />
        </View>
      ) : isError || !reserva ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>No se pudo cargar tu reserva</Text>
          <TouchableOpacity activeOpacity={0.85} style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          showsVerticalScrollIndicator={false}>
          {/* Portada + estado */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: espacio?.imagen ?? IMAGEN_FALLBACK }}
              style={styles.image}
              contentFit="cover"
            />
            <View style={[styles.estadoBadge, { backgroundColor: ESTADO_RESERVA_COLOR[reserva.estado] }]}>
              <Text style={styles.estadoBadgeText}>{ESTADO_RESERVA_LABEL[reserva.estado]}</Text>
            </View>
          </View>

          <View style={styles.body}>
            {!!espacio?.subcategoria && <Text style={styles.subcategoria}>{espacio.subcategoria}</Text>}
            <Text style={styles.nombre}>{reserva.espacioTitulo}</Text>
            <Text style={styles.codigo}>
              {reserva.codigo ?? `Reserva #${String(reserva.id).padStart(6, '0')}`}
            </Text>

            {/* Fecha de la reserva */}
            <Text style={styles.sectionTitle}>Fecha de tu reserva</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <CalendarIcon size={15} color={Colors.accentTeal} strokeWidth={2} />
                <Text style={styles.infoRowText}>
                  {formatRangoReserva(reserva.fechaInicio, reserva.fechaFin)}
                </Text>
              </View>
              <Text style={styles.infoRowSub}>
                {esCupoCompartido
                  ? `${reserva.pax} entrada${reserva.pax !== 1 ? 's' : ''}`
                  : `${reserva.totalHoras} hora${reserva.totalHoras !== 1 ? 's' : ''}`}
              </Text>
            </View>

            {/* Ubicación */}
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Ubicación del espacio</Text>
            <View style={styles.mapContainer}>
              {espacioCoords ? (
                <LocationMap latitude={espacioCoords.latitude} longitude={espacioCoords.longitude} />
              ) : (
                <View style={styles.mapUnavailable}>
                  <LocationIcon size={20} color={Colors.gray400} />
                  <Text style={styles.mapUnavailableText}>Ubicación no disponible</Text>
                </View>
              )}
              {!!espacio?.ubicacion && (
                <View style={styles.mapLabel}>
                  <LocationIcon size={10} color={Colors.white} />
                  <Text style={styles.mapLabelText}>{espacio.ubicacion}</Text>
                </View>
              )}
            </View>

            {/* Costos */}
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Costos</Text>
            <View style={styles.infoCard}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Subtotal</Text>
                <Text style={styles.costValue}>${reserva.pago.subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Comisión de servicio</Text>
                <Text style={styles.costValue}>${reserva.pago.comision.toFixed(2)}</Text>
              </View>
              <View style={styles.costDivider} />
              <View style={styles.costRow}>
                <Text style={styles.costTotal}>Total</Text>
                <Text style={styles.costTotalValue}>${(reserva.pago.total ?? 0).toFixed(2)}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Pagado</Text>
                <Text style={styles.costValue}>${reserva.pago.pagado.toFixed(2)}</Text>
              </View>
              {reserva.pago.pendiente > 0 && (
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Pendiente</Text>
                  <Text style={[styles.costValue, styles.costPendiente]}>
                    ${reserva.pago.pendiente.toFixed(2)}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.estadoPagoBadge,
                  { backgroundColor: ESTADO_PAGO_COLOR[reserva.estadoPago] },
                ]}>
                <Text style={styles.estadoPagoText}>{ESTADO_PAGO_LABEL[reserva.estadoPago]}</Text>
              </View>
            </View>

            {/* Facturas */}
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Facturas</Text>
            {isLoadingFacturas ? (
              <View style={styles.infoBanner}>
                <ActivityIndicator size="small" color={Colors.gray500} />
                <Text style={styles.infoBannerText}>Consultando facturas…</Text>
              </View>
            ) : isErrorFacturas ? (
              <View style={styles.warningBanner}>
                <Text style={styles.warningBannerText}>⚠️ No se pudieron cargar las facturas.</Text>
                <TouchableOpacity onPress={() => refetchFacturas()}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : facturas.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {reserva.estadoPago === 'pagado'
                    ? 'Tus facturas se emiten automáticamente al confirmarse el pago; vuelve a revisar en unos minutos.'
                    : 'Las facturas se generan una vez que la reserva quede pagada.'}
                </Text>
              </View>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {facturas.map(factura => (
                  <FacturaCard key={factura.id} reservaId={reservaId} factura={factura} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

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
    width: 36,
    height: 36,
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  errorTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xxl,
  },
  retryBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  imageContainer: {
    height: 200,
    width: '100%',
    backgroundColor: Colors.gray200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  estadoBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  estadoBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    padding: Spacing.xl,
  },
  subcategoria: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.accentTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nombre: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  codigo: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: Spacing.lg,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoRowText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray700,
  },
  infoRowSub: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
  },
  mapContainer: {
    height: 140,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: 'relative',
  },
  mapLabel: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  mapLabelText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  mapUnavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  mapUnavailableText: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: FontWeight.semiBold,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
  },
  costValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray700,
  },
  costPendiente: {
    color: Colors.error,
  },
  costDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  costTotal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  costTotalValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  estadoPagoBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  estadoPagoText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  infoBannerText: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: FontWeight.medium,
  },
  warningBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 4,
  },
  warningBannerText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },
  retryText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyText: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    lineHeight: 18,
  },
  facturaCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  facturaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  facturaTipo: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  facturaEstadoBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  facturaEstadoText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  facturaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  facturaLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
  },
  facturaValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray700,
    flexShrink: 1,
    textAlign: 'right',
  },
  facturaValueBold: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  facturaMotivo: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: 2,
  },
  facturaPdfBtn: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: Colors.tealLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  facturaPdfBtnDisabled: {
    opacity: 0.6,
  },
  facturaPdfBtnText: {
    color: Colors.accentTeal,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
