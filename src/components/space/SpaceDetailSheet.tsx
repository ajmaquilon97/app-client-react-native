import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Disponibilidad, Espacio, Reserva } from '@/types';
import { ArrowLeftIcon, HeartIcon, CheckIcon, LocationIcon } from '@/components/icons';
import PaymentModal from '@/components/payment/PaymentModal';
import { useAuth } from '@/context/AuthContext';
import { useLocationContext } from '@/context/LocationContext';
import { haversineDistanceKm, formatDistanceKm } from '@/utils/geo';
import {
  esMismoDia,
  formatFecha,
  formatHora,
  toDateOnlyString,
  toLocalDateTimeString,
} from '@/utils/fechas';
import {
  fetchDisponibilidad,
  crearReserva,
  registrarPago,
  cancelarReserva,
  FacturacionInput,
} from '@/services/reservas.service';
import { SERVICE_FEE_RATE } from '@/config/paymentConfig';
import LocationMap from '@/components/space/LocationMap';
import DaySelector from '@/components/space/DaySelector';
import HourRangeSelector from '@/components/space/HourRangeSelector';
import { MIS_RESERVAS_QUERY_KEY } from '@/hooks/useMisReservas';

// Si el cliente no completa los datos de facturación, se manda como
// "consumidor final" (identificación genérica estándar en Ecuador para
// facturas sin RUC/cédula real del comprador).
const FACTURACION_CONSUMIDOR_FINAL: FacturacionInput = {
  identificacion: '9999999999999',
  nombre: 'Consumidor Final',
  correo: '',
};

interface SpaceDetailSheetProps {
  visible: boolean;
  espacio: Espacio | null;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onClose: () => void;
}

const SpaceDetailSheet: React.FC<SpaceDetailSheetProps> = ({
  visible,
  espacio,
  isFavorite,
  onToggleFavorite,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fetchAuthorized, user } = useAuth();
  const hoy = useMemo(() => new Date(), [visible]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [horaDesde, setHoraDesde] = useState<number | null>(null);
  const [horaHasta, setHoraHasta] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [creandoReserva, setCreandoReserva] = useState(false);
  const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null);

  const [identificacionFacturacion, setIdentificacionFacturacion] = useState('');
  const [razonSocialFacturacion, setRazonSocialFacturacion] = useState('');
  const [correoFacturacion, setCorreoFacturacion] = useState('');

  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [disponibilidadLoading, setDisponibilidadLoading] = useState(false);
  const [disponibilidadError, setDisponibilidadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedDate(null);
      setHoraDesde(null);
      setHoraHasta(null);
      setShowPayment(false);
      setReservaCreada(null);
      setIdentificacionFacturacion('');
      setRazonSocialFacturacion('');
      setCorreoFacturacion('');
      setDisponibilidad(null);
      setDisponibilidadError(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !espacio || !selectedDate) {
      setDisponibilidad(null);
      return;
    }
    let cancelled = false;
    setDisponibilidadLoading(true);
    setDisponibilidadError(null);

    (async () => {
      try {
        const data = await fetchAuthorized(accessToken =>
          fetchDisponibilidad(espacio.id, toDateOnlyString(selectedDate), accessToken),
        );
        if (!cancelled) setDisponibilidad(data);
      } catch (err) {
        if (!cancelled) {
          setDisponibilidadError(
            err instanceof Error ? err.message : 'No se pudo obtener la disponibilidad.',
          );
        }
      } finally {
        if (!cancelled) setDisponibilidadLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, espacio, selectedDate, fetchAuthorized]);

  const handleChangeHoraDesde = useCallback((hora: number) => {
    setHoraDesde(hora);
    setHoraHasta(prev => (prev != null && prev > hora ? prev : null));
  }, []);

  const cantidadHoras = horaDesde != null && horaHasta != null ? horaHasta - horaDesde : 0;
  const esHoy = !!selectedDate && esMismoDia(selectedDate, hoy);

  const { coords: userCoords, loading: userLocationLoading, refresh: refreshLocation } = useLocationContext();

  // La ubicación ya se captura al abrir la app; si aún no la tenemos (permiso
  // recién concedido, primer intento fallido, etc.) la reintentamos al abrir el detalle.
  useEffect(() => {
    if (visible && espacio && !userCoords) {
      refreshLocation();
    }
  }, [visible, espacio, userCoords, refreshLocation]);

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

  const handleReservar = useCallback(async () => {
    if (!espacio) return;
    if (!selectedDate || horaDesde == null || horaHasta == null) {
      Alert.alert(
        'Faltan datos',
        'Elige el día y el rango de horas (desde–hasta) para tu reserva.',
        [{ text: 'Entendido' }],
      );
      return;
    }
    if (!disponibilidad?.tarifa) {
      Alert.alert(
        'Tarifa no disponible',
        'Este espacio no tiene una tarifa configurada para el día elegido. Prueba con otro día.',
        [{ text: 'Entendido' }],
      );
      return;
    }

    const facturacionCompletada =
      identificacionFacturacion.trim() || razonSocialFacturacion.trim() || correoFacturacion.trim();
    const facturacion: FacturacionInput = facturacionCompletada
      ? {
          identificacion: identificacionFacturacion.trim(),
          nombre: razonSocialFacturacion.trim(),
          correo: correoFacturacion.trim(),
        }
      : FACTURACION_CONSUMIDOR_FINAL;

    setCreandoReserva(true);
    try {
      const nueva = await fetchAuthorized(accessToken =>
        crearReserva(
          {
            espacioId: espacio.id,
            fechaInicio: toLocalDateTimeString(selectedDate, horaDesde),
            fechaFin: toLocalDateTimeString(selectedDate, horaHasta),
            totalHoras: cantidadHoras,
            facturacion,
          },
          user?.id ?? '',
          accessToken,
        ),
      );
      setReservaCreada(nueva);
      setShowPayment(true);
      // La reserva (aunque sea 'pendiente') ya existe en backend — si el
      // usuario mira Calendario ahora, que la vea sin esperar el staleTime.
      queryClient.invalidateQueries({ queryKey: MIS_RESERVAS_QUERY_KEY });
    } catch (err) {
      Alert.alert(
        'No se pudo crear la reserva',
        err instanceof Error ? err.message : 'Intenta de nuevo.',
        [{ text: 'Entendido' }],
      );
    } finally {
      setCreandoReserva(false);
    }
  }, [
    espacio,
    selectedDate,
    horaDesde,
    horaHasta,
    disponibilidad,
    cantidadHoras,
    user,
    fetchAuthorized,
    queryClient,
    identificacionFacturacion,
    razonSocialFacturacion,
    correoFacturacion,
  ]);

  const fechaHoraTexto =
    selectedDate && horaDesde != null && horaHasta != null
      ? `${formatFecha(selectedDate)} · ${formatHora(horaDesde)}–${formatHora(horaHasta)}`
      : '';

  const handlePaymentSuccess = useCallback(async (result?: { pagoYaRegistrado?: boolean }) => {
    // Datafast ya registra el pago en el backend al verificar la transacción
    // (ver datafast.service.ts); solo hace falta este registro manual para
    // pasarelas que todavía no confirman el pago del lado del servidor (Kushki).
    if (reservaCreada && !result?.pagoYaRegistrado) {
      try {
        await fetchAuthorized(accessToken =>
          registrarPago(reservaCreada.id, reservaCreada.pago.total ?? 0, accessToken),
        );
      } catch (err) {
        Alert.alert(
          'Pago procesado, pero no se pudo registrar',
          err instanceof Error ? err.message : 'Contacta soporte con tu comprobante.',
          [{ text: 'Entendido' }],
        );
      }
    }
    setShowPayment(false);
    setSelectedDate(null);
    setHoraDesde(null);
    setHoraHasta(null);
    setReservaCreada(null);
    // El pago cambió el estado de la reserva en backend — que Calendario
    // muestre el estado fresco ("pagado") en vez de la caché de hace un rato.
    queryClient.invalidateQueries({ queryKey: MIS_RESERVAS_QUERY_KEY });
    onClose();
    router.navigate('/calendario');
  }, [reservaCreada, fetchAuthorized, onClose, router, queryClient]);

  const handleClosePayment = useCallback(async () => {
    setShowPayment(false);
    if (reservaCreada) {
      try {
        await fetchAuthorized(accessToken =>
          cancelarReserva(reservaCreada.id, 'Cliente canceló el pago', accessToken),
        );
        queryClient.invalidateQueries({ queryKey: MIS_RESERVAS_QUERY_KEY });
      } catch {
        // best effort: no bloqueamos la UI si la cancelación silenciosa falla
      }
      setReservaCreada(null);
    }
  }, [reservaCreada, fetchAuthorized]);

  if (!espacio) return null;

  const precioDelDia = disponibilidad?.tarifa?.precio ?? espacio.precio;
  const subtotalReserva = cantidadHoras > 0 ? precioDelDia * cantidadHoras : 0;
  const comisionServicio = subtotalReserva * SERVICE_FEE_RATE;
  const totalReserva = subtotalReserva + comisionServicio;

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
            <ArrowLeftIcon size={20} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Detalle del Espacio</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={handleFavoritePress} style={styles.headerBtn}>
            <HeartIcon size={20} color={isFavorite ? Colors.rose : Colors.white} filled={isFavorite} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
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
                    <CheckIcon size={14} color={Colors.accentTeal} />
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
                    <LocationIcon size={20} color={Colors.gray400} />
                    <Text style={styles.mapUnavailableText}>Ubicación no disponible</Text>
                  </View>
                )}
                <View style={styles.mapLabel}>
                  <LocationIcon size={10} color={Colors.white} />
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
                    ${espacio.precio} <Text style={styles.bookingPriceUnit}>/{espacio.unidad}</Text>
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Día</Text>
                <DaySelector hoy={hoy} selectedDate={selectedDate} onSelect={setSelectedDate} />

                {selectedDate && (
                  <>
                    {disponibilidadLoading && (
                      <View style={styles.infoBanner}>
                        <ActivityIndicator size="small" color={Colors.gray500} />
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

                <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Horario</Text>
                <HourRangeSelector
                  horaDesde={horaDesde}
                  horaHasta={horaHasta}
                  onChangeDesde={handleChangeHoraDesde}
                  onChangeHasta={setHoraHasta}
                  horasEstado={disponibilidad?.horas}
                />

                {/* Desglose de costos */}
                {cantidadHoras > 0 && disponibilidad?.tarifa && (
                  <View style={[styles.costBreakdown, styles.costBreakdownSpaced]}>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>
                        Costo por {cantidadHoras} {espacio.unidad}
                        {cantidadHoras !== 1 ? 's' : ''}:
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
                      Si no los completas, la factura se emite a "Consumidor Final".
                    </Text>

                    <Text style={[styles.inputLabel, styles.facturacionInputLabel]}>Cédula o RUC</Text>
                    <TextInput
                      value={identificacionFacturacion}
                      onChangeText={setIdentificacionFacturacion}
                      placeholder="Ej. 0102030405"
                      placeholderTextColor={Colors.gray400}
                      keyboardType="number-pad"
                      maxLength={13}
                      style={styles.facturacionInput}
                    />

                    <Text style={[styles.inputLabel, styles.facturacionInputLabel]}>Razón social / Nombre</Text>
                    <TextInput
                      value={razonSocialFacturacion}
                      onChangeText={setRazonSocialFacturacion}
                      placeholder="Nombre o empresa a facturar"
                      placeholderTextColor={Colors.gray400}
                      style={styles.facturacionInput}
                    />

                    <Text style={[styles.inputLabel, styles.facturacionInputLabel]}>Correo electrónico</Text>
                    <TextInput
                      value={correoFacturacion}
                      onChangeText={setCorreoFacturacion}
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor={Colors.gray400}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.facturacionInput}
                    />
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleReservar}
                  disabled={creandoReserva}
                  style={[styles.reserveButton, creandoReserva && styles.reserveButtonDisabled]}>
                  {creandoReserva ? (
                    <ActivityIndicator size="small" color={Colors.accentTeal} />
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
                      <Text style={styles.reviewText}>"{com.texto}"</Text>
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
          espacio={espacio}
          fecha={fechaHoraTexto}
          cantidad={cantidadHoras}
          total={(reservaCreada?.pago.total ?? totalReserva).toFixed(2)}
          reservaId={reservaCreada?.id ?? null}
          onClose={handleClosePayment}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
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
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  imageContainer: {
    height: 240,
    width: '100%',
    backgroundColor: Colors.gray200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  subcategoryBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(30,58,95,0.9)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  subcategoryText: {
    color: Colors.accentTeal,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  disponibleBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.accentTeal,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
  },
  disponibleText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  body: {
    padding: Spacing.xl,
  },
  nombre: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    lineHeight: 28,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: Spacing.md,
  },
  rating: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.amber,
  },
  metaDot: {
    color: Colors.gray400,
    fontSize: FontSize.sm,
  },
  reviewsLink: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    fontWeight: FontWeight.medium,
  },
  distancia: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.accentTeal,
  },
  hostInfo: {
    flex: 1,
  },
  hostLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hostName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    marginTop: 1,
  },
  hostSince: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
  },
  contactBtn: {
    backgroundColor: Colors.tealLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  contactBtnText: {
    color: Colors.accentTeal,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
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
  descCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  descripcion: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
    lineHeight: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
    width: '47%',
  },
  serviceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray700,
    flex: 1,
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
  normasCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  normaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  normaDot: {
    color: Colors.amber,
    fontSize: FontSize.base,
    lineHeight: 18,
  },
  normaText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.gray600,
    lineHeight: 18,
  },
  bookingCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(30,58,95,0.2)',
    gap: Spacing.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bookingHeaderLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingHeaderPrice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  bookingPriceUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    color: Colors.gray500,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: -Spacing.xs,
  },
  inputLabelSpaced: {
    marginTop: Spacing.sm,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
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
    marginTop: Spacing.xs,
  },
  warningBannerText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },
  costBreakdown: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  costBreakdownSpaced: {
    marginTop: Spacing.sm,
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
  costDivider: {
    height: 1,
    backgroundColor: Colors.border,
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
  facturacionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  facturacionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray700,
  },
  facturacionHelper: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    marginTop: -4,
  },
  facturacionInputLabel: {
    marginTop: 0,
    marginBottom: 0,
  },
  facturacionInput: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  reserveButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    ...Platform.select({
      ios: { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  reserveButtonDisabled: {
    opacity: 0.7,
  },
  reserveButtonText: {
    color: Colors.accentTeal,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    letterSpacing: 1.2,
  },
  successBanner: {
    backgroundColor: Colors.accentTeal,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  successText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewUser: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  reviewDate: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
  },
  reviewStars: {
    fontSize: FontSize.sm,
    color: Colors.amber,
  },
  reviewText: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export default React.memo(SpaceDetailSheet);
