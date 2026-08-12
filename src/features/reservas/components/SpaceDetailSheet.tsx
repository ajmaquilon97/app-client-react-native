import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocationContext } from '@/shared/location/LocationContext';
import { Espacio, LocationMap } from '@/features/espacios';
import { SaveToListSheet } from '@/features/favoritos';
import { PaymentModal, SERVICE_FEE_RATE } from '@/features/pagos';
import { ArrowLeftIcon, CheckIcon, HeartIcon, LocationIcon } from '@/shared/ui/icons';
import { makeStyles, spacing, useTheme } from '@/shared/theme';
import { esMismoDia, formatFecha, formatHora } from '@/shared/utils/fechas';
import { formatDistanceKm, haversineDistanceKm } from '@/shared/utils/geo';

import DaySelector from './DaySelector';
import HourRangeSelector from './HourRangeSelector';
import TicketQuantitySelector from './TicketQuantitySelector';
import { useReservaFlow } from '../hooks/useReservaFlow';

interface SpaceDetailSheetProps {
  visible: boolean;
  espacio: Espacio | null;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onClose: () => void;
}

/**
 * Detalle del espacio y flujo de reserva.
 *
 * Solo presentación: la máquina de estados (selección → creación → pago), las
 * consultas de disponibilidad y aforo y las mutaciones viven en
 * `useReservaFlow`. Vive en la feature de reservas, no en la de espacios,
 * porque su lógica es la de reservar y porque `reservas → espacios` es la
 * dirección permitida entre features.
 */
const SpaceDetailSheet: React.FC<SpaceDetailSheetProps> = ({
  visible,
  espacio,
  isFavorite,
  onToggleFavorite,
  onClose,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [guardarEnListaVisible, setGuardarEnListaVisible] = useState(false);

  const handleReservaPagada = useCallback(() => {
    setGuardarEnListaVisible(false);
    onClose();
    router.navigate('/calendario');
  }, [onClose, router]);

  const flow = useReservaFlow({ espacio, visible, onReservaPagada: handleReservaPagada });

  const {
    esCupoCompartido,
    selectedDate,
    setSelectedDate,
    horaDesde,
    horaHasta,
    handleChangeHoraDesde,
    setHoraHasta,
    cantidadEntradas,
    setCantidadEntradas,
    identificacionFacturacion,
    setIdentificacionFacturacion,
    razonSocialFacturacion,
    setRazonSocialFacturacion,
    correoFacturacion,
    setCorreoFacturacion,
    disponibilidad,
    disponibilidadLoading,
    disponibilidadError,
    aforo,
    aforoLoading,
    aforoError,
    cantidadUnidades,
    precioDelDia,
    subtotal: subtotalReserva,
    comision: comisionServicio,
    total: totalReserva,
    reservar,
    creandoReserva,
    reservaCreada,
    showPayment,
    confirmarPago,
    cancelarPago,
  } = flow;

  // NO BORRAR este useMemo: no es una optimización. La dependencia `visible` es
  // intencional y es lo único que hace el trabajo — recalcula "hoy" cada vez que
  // se abre la hoja (para que el listado de días arranque correcto aunque la app
  // lleve horas abierta) y lo congela mientras está abierta (para que no salte
  // bajo los dedos del usuario si cruza la medianoche). Sin el memo, `new Date()`
  // cambiaría en cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hoy = useMemo(() => new Date(), [visible]);
  const esHoy = !!selectedDate && esMismoDia(selectedDate, hoy);

  const { coords: userCoords, loading: userLocationLoading } = useLocationContext();

  const espacioCoords = useMemo(() => {
    if (!espacio || espacio.latitud == null || espacio.longitud == null) return null;
    return { latitude: espacio.latitud, longitude: espacio.longitud };
  }, [espacio]);

  const distanciaKm = useMemo(() => {
    if (!userCoords || !espacioCoords) return null;
    return haversineDistanceKm(userCoords, espacioCoords);
  }, [userCoords, espacioCoords]);

  const handleFavoritePress = useCallback(() => {
    if (espacio) onToggleFavorite(espacio.id);
  }, [espacio, onToggleFavorite]);

  const handleFavoriteLongPress = useCallback(() => {
    if (espacio) setGuardarEnListaVisible(true);
  }, [espacio]);

  if (!espacio) return null;

  // Backend hoy reutiliza la modalidad de tarifa "hora" como precio de entrada
  // para piscinas (ver docs/backend-espacios-archetypes-spec.md §4, sin decidir
  // todavía), así que `espacio.unidad` vendría mal etiquetado: se fuerza acá.
  const unidadLabel = esCupoCompartido ? 'entrada' : espacio.unidad;
  // Para que el resumen genérico de pago diga "entrada(s)" y no "hora(s)".
  const espacioParaPago = esCupoCompartido ? { ...espacio, unidad: unidadLabel } : espacio;

  const fechaHoraTexto = !selectedDate
    ? ''
    : esCupoCompartido
      ? `${formatFecha(selectedDate)} · ${cantidadEntradas} entrada${cantidadEntradas !== 1 ? 's' : ''}`
      : horaDesde != null && horaHasta != null
        ? `${formatFecha(selectedDate)} · ${formatHora(horaDesde)}–${formatHora(horaHasta)}`
        : '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.headerBtn}>
            <ArrowLeftIcon size={20} color={colors.headerText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Detalle del Espacio</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleFavoritePress}
            onLongPress={handleFavoriteLongPress}
            style={styles.headerBtn}>
            <HeartIcon size={20} color={isFavorite ? colors.favorite : colors.surface} filled={isFavorite} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxxl }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* Cover image */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: espacio.imagen }} style={styles.image} contentFit="cover" />
              <View style={styles.subcategoryBadge}>
                <Text style={styles.subcategoryText}>{espacio.subcategoria}</Text>
              </View>
              {espacio.disponibleHoy && (
                <View style={styles.disponibleBadge}>
                  <Text style={styles.disponibleText}>⚡ Disponible Hoy</Text>
                </View>
              )}
            </View>

            <View style={styles.body}>

              {/* Nombre y rating */}
              <Text style={styles.nombre}>{espacio.nombre}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.rating}>★ {espacio.rating}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.reviewsLink}>{espacio.reviews} reseñas verificadas</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.distancia}>
                  📍{' '}
                  {distanciaKm != null
                    ? `a ${formatDistanceKm(distanciaKm)}`
                    : userLocationLoading
                      ? 'Calculando distancia…'
                      : 'Ubicación no disponible'}
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Anfitrión */}
              <View style={styles.hostCard}>
                <Image
                  source={{ uri: espacio.anfitrion.avatar }}
                  style={styles.hostAvatar}
                  contentFit="cover"
                />
                <View style={styles.hostInfo}>
                  <Text style={styles.hostLabel}>Anfitrión del espacio</Text>
                  <Text style={styles.hostName}>
                    {espacio.anfitrion.nombre}
                    {espacio.anfitrion.verificado ? ' ✔' : ''}
                  </Text>
                  <Text style={styles.hostSince}>{espacio.anfitrion.registro}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.8} style={styles.contactBtn}>
                  <Text style={styles.contactBtnText}>Contactar</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Descripción */}
              <Text style={styles.sectionTitle}>Sobre el Espacio</Text>
              <View style={styles.descCard}>
                <Text style={styles.descripcion}>{espacio.descripcion}</Text>
              </View>

              {/* Servicios */}
              <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Servicios Incluidos</Text>
              <View style={styles.servicesGrid}>
                {espacio.servicios.map((servicio, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <CheckIcon size={14} color={colors.accent} />
                    <Text style={styles.serviceText} numberOfLines={1}>{servicio}</Text>
                  </View>
                ))}
              </View>

              {/* Mapa de ubicación */}
              <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Ubicación aproximada</Text>
              <View style={styles.mapContainer}>
                {espacioCoords ? (
                  <LocationMap
                    latitude={espacioCoords.latitude}
                    longitude={espacioCoords.longitude}
                  />
                ) : (
                  <View style={styles.mapUnavailable}>
                    <LocationIcon size={20} color={colors.textMuted} />
                    <Text style={styles.mapUnavailableText}>Ubicación no disponible</Text>
                  </View>
                )}
                <View style={styles.mapLabel}>
                  <LocationIcon size={10} color={colors.headerText} />
                  <Text style={styles.mapLabelText}>{espacio.ubicacion}</Text>
                </View>
              </View>

              {/* Normas */}
              <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Normas del Lugar</Text>
              <View style={styles.normasCard}>
                {espacio.normas.map((norma, idx) => (
                  <View key={idx} style={styles.normaRow}>
                    <Text style={styles.normaDot}>•</Text>
                    <Text style={styles.normaText}>{norma}</Text>
                  </View>
                ))}
              </View>

              {/* Calculadora de reserva */}
              <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingHeaderLabel}>Planifica tu reserva</Text>
                  <Text style={styles.bookingHeaderPrice}>
                    ${espacio.precio} <Text style={styles.bookingPriceUnit}>/{unidadLabel}</Text>
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Día</Text>
                <DaySelector hoy={hoy} selectedDate={selectedDate} onSelect={setSelectedDate} />

                {selectedDate && (
                  <>
                    {disponibilidadLoading && (
                      <View style={styles.infoBanner}>
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                        <Text style={styles.infoBannerText}>Consultando tarifa y disponibilidad…</Text>
                      </View>
                    )}
                    {!disponibilidadLoading && disponibilidadError && (
                      <View style={styles.warningBanner}>
                        <Text style={styles.warningBannerText}>⚠️ {disponibilidadError}</Text>
                      </View>
                    )}
                    {!disponibilidadLoading && !disponibilidadError && disponibilidad && !disponibilidad.tarifa && (
                      <View style={styles.warningBanner}>
                        <Text style={styles.warningBannerText}>
                          ⚠️ Este espacio no tiene una tarifa configurada para el {esHoy ? 'día de hoy' : 'día elegido'}.
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {esCupoCompartido ? (
                  <>
                    <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Cantidad de entradas</Text>
                    <TicketQuantitySelector
                      cantidad={cantidadEntradas}
                      onChange={setCantidadEntradas}
                      aforo={aforo}
                      loading={aforoLoading}
                      error={aforoError}
                    />
                  </>
                ) : (
                  <>
                    <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Horario</Text>
                    <HourRangeSelector
                      horaDesde={horaDesde}
                      horaHasta={horaHasta}
                      onChangeDesde={handleChangeHoraDesde}
                      onChangeHasta={setHoraHasta}
                      horasEstado={disponibilidad?.horas}
                    />
                  </>
                )}

                {/* Desglose de costos */}
                {cantidadUnidades > 0 && disponibilidad?.tarifa && (
                  <View style={[styles.costBreakdown, styles.costBreakdownSpaced]}>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>
                        Costo por {cantidadUnidades} {unidadLabel}
                        {cantidadUnidades !== 1 ? 's' : ''}:
                      </Text>
                      <Text style={styles.costValue}>${precioDelDia} c/u</Text>
                    </View>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>Subtotal:</Text>
                      <Text style={styles.costValue}>${subtotalReserva.toFixed(2)}</Text>
                    </View>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>
                        Comisión de servicio ({(SERVICE_FEE_RATE * 100).toFixed(0)}%):
                      </Text>
                      <Text style={styles.costValue}>${comisionServicio.toFixed(2)}</Text>
                    </View>
                    <View style={styles.costDivider} />
                    <View style={styles.costRow}>
                      <Text style={styles.costTotal}>Total a pagar:</Text>
                      <Text style={styles.costTotalValue}>${totalReserva.toFixed(2)}</Text>
                    </View>

                    <View style={styles.facturacionDivider} />
                    <Text style={styles.facturacionTitle}>Datos de facturación (opcional)</Text>
                    <Text style={styles.facturacionHelper}>
                      Si no los completas, la factura se emite a &ldquo;Consumidor Final&rdquo;.
                    </Text>

                    <Text style={[styles.inputLabel, styles.facturacionInputLabel]}>Cédula o RUC</Text>
                    <TextInput
                      value={identificacionFacturacion}
                      onChangeText={setIdentificacionFacturacion}
                      placeholder="Ej. 0102030405"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={13}
                      style={styles.facturacionInput}
                    />

                    <Text style={[styles.inputLabel, styles.facturacionInputLabel]}>Razón social / Nombre</Text>
                    <TextInput
                      value={razonSocialFacturacion}
                      onChangeText={setRazonSocialFacturacion}
                      placeholder="Nombre o empresa a facturar"
                      placeholderTextColor={colors.textMuted}
                      style={styles.facturacionInput}
                    />

                    <Text style={[styles.inputLabel, styles.facturacionInputLabel]}>Correo electrónico</Text>
                    <TextInput
                      value={correoFacturacion}
                      onChangeText={setCorreoFacturacion}
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.facturacionInput}
                    />
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={reservar}
                  disabled={creandoReserva}
                  style={[styles.reserveButton, creandoReserva && styles.reserveButtonDisabled]}>
                  {creandoReserva ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Text style={styles.reserveButtonText}>CONTINUAR AL PAGO →</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Reseñas */}
              {espacio.comentarios.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
                    Reseñas de Usuarios ({espacio.comentarios.length})
                  </Text>
                  {espacio.comentarios.map((com, idx) => (
                    <View key={idx} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewUser}>{com.usuario}</Text>
                        <Text style={styles.reviewDate}>{com.fecha}</Text>
                      </View>
                      <Text style={styles.reviewStars}>
                        {'★'.repeat(com.rating)}{'☆'.repeat(5 - com.rating)}
                      </Text>
                      <Text style={styles.reviewText}>&ldquo;{com.texto}&rdquo;</Text>
                    </View>
                  ))}
                </>
              )}

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {espacio && (
        <PaymentModal
          visible={showPayment}
          espacio={espacioParaPago}
          fecha={fechaHoraTexto}
          cantidad={cantidadUnidades}
          total={(reservaCreada?.pago.total ?? totalReserva).toFixed(2)}
          reservaId={reservaCreada?.id ?? null}
          onClose={cancelarPago}
          onSuccess={confirmarPago}
        />
      )}

      <SaveToListSheet
        visible={guardarEnListaVisible}
        espacioId={espacio?.id ?? null}
        onClose={() => setGuardarEnListaVisible(false)}
      />
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
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
    color: t.colors.headerText,
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
    marginHorizontal: t.spacing.sm,
  },
  scrollContent: {
    paddingBottom: t.spacing.xxxl,
  },
  imageContainer: {
    height: 240,
    width: '100%',
    backgroundColor: t.colors.skeleton,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  subcategoryBadge: {
    position: 'absolute',
    bottom: t.spacing.md,
    left: t.spacing.md,
    backgroundColor: t.colors.primaryScrim,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 5,
    borderRadius: t.radius.full,
  },
  subcategoryText: {
    color: t.colors.accent,
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  disponibleBadge: {
    position: 'absolute',
    bottom: t.spacing.md,
    right: t.spacing.md,
    backgroundColor: t.colors.accent,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 5,
    borderRadius: t.radius.md,
  },
  disponibleText: {
    color: t.colors.onAccent,
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
  },
  body: {
    padding: t.spacing.xl,
  },
  nombre: {
    fontSize: t.fontSize.xl,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    lineHeight: 28,
    marginBottom: t.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: t.spacing.md,
  },
  rating: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.star,
  },
  metaDot: {
    color: t.colors.textMuted,
    fontSize: t.fontSize.sm,
  },
  reviewsLink: {
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
  },
  distancia: {
    fontSize: t.fontSize.sm,
    color: t.colors.primaryText,
    fontWeight: t.fontWeight.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: t.spacing.md,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    gap: t.spacing.sm,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: t.colors.accent,
  },
  hostInfo: {
    flex: 1,
  },
  hostLabel: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hostName: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    marginTop: 1,
  },
  hostSince: {
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
  },
  contactBtn: {
    backgroundColor: t.colors.accentSoft,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.md,
  },
  contactBtnText: {
    color: t.colors.accent,
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
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
  descCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
  },
  descripcion: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    lineHeight: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.xs,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    gap: 6,
    width: '47%',
  },
  serviceText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textPrimary,
    flex: 1,
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
  normasCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    gap: t.spacing.xs,
  },
  normaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.xs,
  },
  normaDot: {
    color: t.colors.star,
    fontSize: t.fontSize.base,
    lineHeight: 18,
  },
  normaText: {
    flex: 1,
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  bookingCard: {
    marginTop: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 2,
    borderColor: t.colors.primarySoft,
    gap: t.spacing.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  bookingHeaderLabel: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingHeaderPrice: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  bookingPriceUnit: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.regular,
    color: t.colors.textSecondary,
  },
  inputLabel: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: -t.spacing.xs,
  },
  inputLabelSpaced: {
    marginTop: t.spacing.sm,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    backgroundColor: t.colors.background,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    marginTop: t.spacing.xs,
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
    marginTop: t.spacing.xs,
  },
  warningBannerText: {
    fontSize: t.fontSize.xs,
    color: t.colors.error,
    fontWeight: t.fontWeight.medium,
  },
  costBreakdown: {
    backgroundColor: t.colors.background,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
    gap: 6,
  },
  costBreakdownSpaced: {
    marginTop: t.spacing.sm,
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
  costDivider: {
    height: 1,
    backgroundColor: t.colors.border,
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
  facturacionDivider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: 4,
  },
  facturacionTitle: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textPrimary,
  },
  facturacionHelper: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    marginTop: -4,
  },
  facturacionInputLabel: {
    marginTop: 0,
    marginBottom: 0,
  },
  facturacionInput: {
    height: 40,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.sm,
    fontSize: t.fontSize.base,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surface,
  },
  reserveButton: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    ...Platform.select({
      ios: { shadowColor: t.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  reserveButtonDisabled: {
    opacity: 0.7,
  },
  reserveButtonText: {
    color: t.colors.accent,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    letterSpacing: 1.2,
  },
  successBanner: {
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm,
    alignItems: 'center',
  },
  successText: {
    color: t.colors.onAccent,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
  },
  reviewCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    marginBottom: t.spacing.sm,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewUser: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  reviewDate: {
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
  },
  reviewStars: {
    fontSize: t.fontSize.sm,
    color: t.colors.star,
  },
  reviewText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
}));

export default React.memo(SpaceDetailSheet);
