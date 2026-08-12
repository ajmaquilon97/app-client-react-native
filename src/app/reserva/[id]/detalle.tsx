import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Linking, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon, LocationIcon, CalendarIcon } from '@/shared/ui/icons';
import { useReservaDetalle } from '@/hooks/useReservaDetalle';
import { useFacturasReserva } from '@/hooks/useFacturasReserva';
import { useEspacios, LocationMap, getModalidadReserva } from '@/features/espacios';
import { EstadoPago, EstadoReserva, FacturaStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { facturasDescarga } from '@/services/reservas.service';
import { ResenaSection } from '@/features/resenas';
import { formatRangoReserva } from '@/shared/utils/fechas';
import { ColorToken, makeStyles, spacing, useTheme } from '@/shared/theme';

const IMAGEN_FALLBACK =
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';

const ESTADO_RESERVA_LABEL: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  reagendada: 'Reagendada',
  cancelada: 'Cancelada',
  finalizada: 'Finalizada',
};

const ESTADO_RESERVA_COLOR: Record<EstadoReserva, ColorToken> = {
  pendiente: 'star',
  confirmada: 'accent',
  reagendada: 'accent',
  cancelada: 'textMuted',
  finalizada: 'textMuted',
};

const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pendiente: 'Pago pendiente',
  pagado_parcialmente: 'Pagado parcialmente',
  pagado: 'Pagado',
  reembolsado: 'Reembolsado',
};

const ESTADO_PAGO_COLOR: Record<EstadoPago, ColorToken> = {
  pendiente: 'star',
  pagado_parcialmente: 'star',
  pagado: 'success',
  reembolsado: 'textMuted',
};

// GET /api/reservas/{id}/factura (estado, sin schema formal en swagger) usa el mismo
// campo `tipoFactura` que el backend ya confirmó para /facturas (ver
// docs/feedback-mobile-facturacion.md): "fee_plataforma" | "reserva_espacio". Antes de
// que exista una factura autorizada (con `emisorNombreComercial`, la fuente correcta
// para el título) esto es lo único que tenemos para distinguir una fila de otra.
function tipoFacturaLabel(tipo: string | null): string {
  if (tipo === 'fee_plataforma') return 'Fee de la plataforma';
  if (tipo === 'reserva_espacio') return 'Alquiler del espacio';
  return tipo || 'Factura';
}

const ESTADO_FACTURA_COLOR: Record<string, ColorToken> = {
  Procesando: 'star',
  Recibida: 'star',
  Autorizada: 'success',
  Devuelta: 'error',
  'No autorizada': 'error',
  Error: 'error',
};

function estadoFacturaToken(estado: string): ColorToken {
  return ESTADO_FACTURA_COLOR[estado] ?? 'textMuted';
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
  const styles = useStyles();
  const { colors } = useTheme();
  const { fetchAuthorized } = useAuth();
  const [descargando, setDescargando] = useState(false);
  const autorizada = factura.estado === 'Autorizada';

  const handleDescargar = async () => {
    setDescargando(true);
    try {
      // Se pide fresco en cada tap: las URLs son pre-firmadas y expiran en 1 hora
      // (urlsExpiranEnSegundos, por ítem), así que no se pueden cachear del lado del
      // cliente. Nunca se manda el header Authorization al abrir pdfUrl — la firma va
      // en la propia URL.
      const facturas = await fetchAuthorized(accessToken => facturasDescarga(reservaId, accessToken));
      const item = facturas.find(f => f.tipoFactura === factura.tipoFactura) ?? facturas[0];
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
        <View style={[styles.facturaEstadoBadge, { backgroundColor: colors[estadoFacturaToken(factura.estado)] }]}>
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
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.facturaPdfBtnText}>Descargar factura</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ReservaDetalleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
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
          <ArrowLeftIcon size={20} color={colors.headerText} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {reserva?.espacioTitulo ?? titulo ?? 'Detalle de tu reserva'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.accent} />
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxxl }]}
          showsVerticalScrollIndicator={false}>
          {/* Portada + estado */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: espacio?.imagen ?? IMAGEN_FALLBACK }}
              style={styles.image}
              contentFit="cover"
            />
            <View style={[styles.estadoBadge, { backgroundColor: colors[ESTADO_RESERVA_COLOR[reserva.estado]] }]}>
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
                <CalendarIcon size={15} color={colors.accent} strokeWidth={2} />
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
                  <LocationIcon size={20} color={colors.textMuted} />
                  <Text style={styles.mapUnavailableText}>Ubicación no disponible</Text>
                </View>
              )}
              {!!espacio?.ubicacion && (
                <View style={styles.mapLabel}>
                  <LocationIcon size={10} color={colors.headerText} />
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
                  { backgroundColor: colors[ESTADO_PAGO_COLOR[reserva.estadoPago]] },
                ]}>
                <Text style={styles.estadoPagoText}>{ESTADO_PAGO_LABEL[reserva.estadoPago]}</Text>
              </View>
            </View>

            {/* Facturas */}
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Facturas</Text>
            <Text style={styles.facturasHint}>
              También te las enviamos por correo apenas el SRI las autoriza.
            </Text>
            {isLoadingFacturas ? (
              <View style={styles.infoBanner}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
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
              <View style={{ gap: spacing.sm }}>
                {facturas.map(factura => (
                  <FacturaCard key={factura.id} reservaId={reservaId} factura={factura} />
                ))}
              </View>
            )}

            {/* Reseña */}
            {reserva.estado === 'finalizada' && (
              <View style={styles.sectionTitleSpaced}>
                <ResenaSection espacioId={reserva.espacioId} reservaId={reserva.id} />
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

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
    width: 36,
    height: 36,
    padding: t.spacing.xs,
    backgroundColor: t.colors.overlayWhite,
    borderRadius: t.radius.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: t.colors.headerText,
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
    marginHorizontal: t.spacing.sm,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.xxl,
  },
  errorTitle: {
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm + 2,
    paddingHorizontal: t.spacing.xxl,
  },
  retryBtnText: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
  },
  scrollContent: {
    paddingBottom: t.spacing.xxxl,
  },
  imageContainer: {
    height: 200,
    width: '100%',
    backgroundColor: t.colors.skeleton,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  estadoBadge: {
    position: 'absolute',
    bottom: t.spacing.md,
    left: t.spacing.md,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 5,
    borderRadius: t.radius.full,
  },
  estadoBadgeText: {
    color: t.colors.textInverse,
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    padding: t.spacing.xl,
  },
  subcategoria: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nombre: {
    fontSize: t.fontSize.xl,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    marginTop: 2,
  },
  codigo: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: t.spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: t.spacing.lg,
  },
  facturasHint: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    marginTop: -t.spacing.xs,
    marginBottom: t.spacing.sm,
  },
  infoCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    gap: t.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
  },
  infoRowText: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textPrimary,
  },
  infoRowSub: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
  },
  mapContainer: {
    height: 140,
    borderRadius: t.radius.xl,
    overflow: 'hidden',
    backgroundColor: t.colors.successSoft,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    position: 'relative',
  },
  mapLabel: {
    position: 'absolute',
    bottom: t.spacing.xs,
    right: t.spacing.xs,
    backgroundColor: t.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    borderRadius: t.radius.md,
  },
  mapLabelText: {
    color: t.colors.headerText,
    fontSize: 9,
    fontWeight: t.fontWeight.bold,
  },
  mapUnavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xxs,
  },
  mapUnavailableText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
    fontWeight: t.fontWeight.semiBold,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
  },
  costValue: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textPrimary,
  },
  costPendiente: {
    color: t.colors.error,
  },
  costDivider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: 2,
  },
  costTotal: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  costTotalValue: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  estadoPagoBadge: {
    alignSelf: 'flex-start',
    marginTop: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    borderRadius: t.radius.full,
  },
  estadoPagoText: {
    color: t.colors.textInverse,
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
  },
  infoBannerText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
  },
  warningBanner: {
    backgroundColor: t.colors.errorSoft,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    gap: 4,
  },
  warningBannerText: {
    fontSize: t.fontSize.xs,
    color: t.colors.error,
    fontWeight: t.fontWeight.medium,
  },
  retryText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  emptyState: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
  },
  emptyText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  facturaCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    gap: 6,
  },
  facturaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  facturaTipo: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  facturaEstadoBadge: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 3,
    borderRadius: t.radius.full,
  },
  facturaEstadoText: {
    color: t.colors.textInverse,
    fontSize: 10,
    fontWeight: t.fontWeight.bold,
  },
  facturaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  facturaLabel: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
  },
  facturaValue: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  facturaValueBold: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  facturaMotivo: {
    fontSize: t.fontSize.xs,
    color: t.colors.error,
    marginTop: 2,
  },
  facturaPdfBtn: {
    marginTop: t.spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: t.colors.accentSoft,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  facturaPdfBtnDisabled: {
    opacity: 0.6,
  },
  facturaPdfBtnText: {
    color: t.colors.accent,
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
  },
}));
