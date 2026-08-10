import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { View, Text, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AforoDia, Disponibilidad, Espacio, Reserva } from '@/types';
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
import { fetchAforoDia } from '@/services/aforo.service';
import { getModalidadReserva } from '@/utils/espacioArchetype';
import { SERVICE_FEE_RATE } from '@/config/paymentConfig';
import LocationMap from '@/components/space/LocationMap';
import DaySelector from '@/components/space/DaySelector';
import HourRangeSelector from '@/components/space/HourRangeSelector';
import TicketQuantitySelector from '@/components/space/TicketQuantitySelector';
import { MIS_RESERVAS_QUERY_KEY } from '@/hooks/useMisReservas';
import { makeStyles, spacing, useTheme } from '@/theme';

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
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { fetchAuthorized, user } = useAuth();
  const hoy = useMemo(() => new Date(), [visible]);
  // Ver docs/backend-espacios-archetypes-spec.md — mientras backend no confirme
  // `modalidadReserva`, se infiere localmente (ver espacioArchetype.ts).
  const modalidad = useMemo(
    () => (espacio ? getModalidadReserva(espacio) : 'franja_exclusiva'),
    [espacio],
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [horaDesde, setHoraDesde] = useState<number | null>(null);
  const [horaHasta, setHoraHasta] = useState<number | null>(null);
  const [cantidadEntradas, setCantidadEntradas] = useState(1);
  const [showPayment, setShowPayment] = useState(false);
  const [creandoReserva, setCreandoReserva] = useState(false);
  const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null);

  const [identificacionFacturacion, setIdentificacionFacturacion] = useState('');
  const [razonSocialFacturacion, setRazonSocialFacturacion] = useState('');
  const [correoFacturacion, setCorreoFacturacion] = useState('');

  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [disponibilidadLoading, setDisponibilidadLoading] = useState(false);
  const [disponibilidadError, setDisponibilidadError] = useState<string | null>(null);

  // Aforo disponible del día — solo aplica a espacios `cupo_compartido` (piscinas).
  const [aforo, setAforo] = useState<AforoDia | null>(null);
  const [aforoLoading, setAforoLoading] = useState(false);
  const [aforoError, setAforoError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedDate(null);
      setHoraDesde(null);
      setHoraHasta(null);
      setCantidadEntradas(1);
      setShowPayment(false);
      setReservaCreada(null);
      setIdentificacionFacturacion('');
      setRazonSocialFacturacion('');
      setCorreoFacturacion('');
      setDisponibilidad(null);
      setDisponibilidadError(null);
      setAforo(null);
      setAforoError(null);
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

  useEffect(() => {
    if (!visible || !espacio || !selectedDate || modalidad !== 'cupo_compartido') {
      setAforo(null);
      return;
    }
    let cancelled = false;
    setAforoLoading(true);
    setAforoError(null);

    (async () => {
      try {
        const data = await fetchAuthorized(accessToken =>
          fetchAforoDia(espacio.id, toDateOnlyString(selectedDate), espacio.maxCapacidad, accessToken),
        );
        if (!cancelled) {
          setAforo(data);
          setCantidadEntradas(prev => Math.min(Math.max(prev, 1), Math.max(data.disponible, 1)));
        }
      } catch (err) {
        if (!cancelled) {
          setAforoError(err instanceof Error ? err.message : 'No se pudo obtener el aforo disponible.');
        }
      } finally {
        if (!cancelled) setAforoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, espacio, selectedDate, modalidad, fetchAuthorized]);

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

    if (!selectedDate) {
      Alert.alert('Faltan datos', 'Elige el día para tu reserva.', [{ text: 'Entendido' }]);
      return;
    }

    if (modalidad === 'cupo_compartido') {
      if (cantidadEntradas < 1) {
        Alert.alert('Faltan datos', 'Elige la cantidad de entradas para tu reserva.', [{ text: 'Entendido' }]);
        return;
      }
    } else if (horaDesde == null || horaHasta == null) {
      Alert.alert(
        'Faltan datos',
        'Elige el rango de horas (desde–hasta) para tu reserva.',
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

    // Convención acordada con el equipo Web para `cupo_compartido` (piscinas):
    // fechaInicio = fechaFin = el día elegido, sin franja horaria específica — ver
    // docs/backend-espacios-archetypes-spec.md §3 y FEEDBACK_BACKEND_MODALIDADES_RESERVA.md.
    // `totalHoras: 0` es un placeholder: backend todavía no confirmó qué espera este
    // campo para una venta de entrada.
    const inputReserva =
      modalidad === 'cupo_compartido'
        ? {
            espacioId: espacio.id,
            fechaInicio: toLocalDateTimeString(selectedDate, 0),
            fechaFin: toLocalDateTimeString(selectedDate, 0),
            totalHoras: 0,
            pax: cantidadEntradas,
            facturacion,
          }
        : {
            espacioId: espacio.id,
            // horaDesde/horaHasta ya se validaron como no-nulos arriba para este archetype.
            fechaInicio: toLocalDateTimeString(selectedDate, horaDesde as number),
            fechaFin: toLocalDateTimeString(selectedDate, horaHasta as number),
            totalHoras: cantidadHoras,
            facturacion,
          };

    setCreandoReserva(true);
    try {
      const nueva = await fetchAuthorized(accessToken =>
        crearReserva(inputReserva, user?.id ?? '', accessToken),
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
    modalidad,
    horaDesde,
    horaHasta,
    cantidadEntradas,
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
    modalidad === 'cupo_compartido'
      ? selectedDate
        ? `${formatFecha(selectedDate)} · ${cantidadEntradas} entrada${cantidadEntradas !== 1 ? 's' : ''}`
        : ''
      : selectedDate && horaDesde != null && horaHasta != null
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

  const esCupoCompartido = modalidad === 'cupo_compartido';
  // Backend hoy reutiliza la modalidad de tarifa "hora" como precio de entrada para
  // piscinas (ver docs/backend-espacios-archetypes-spec.md §4, sin decidir todavía), así
  // que `espacio.unidad` vendría mal etiquetado — lo forzamos acá para la UI.
  const unidadLabel = esCupoCompartido ? 'entrada' : espacio.unidad;
  const cantidadUnidades = esCupoCompartido ? cantidadEntradas : cantidadHoras;
  const precioDelDia = disponibilidad?.tarifa?.precio ?? espacio.precio;
  const subtotalReserva = cantidadUnidades > 0 ? precioDelDia * cantidadUnidades : 0;
  const comisionServicio = subtotalReserva * SERVICE_FEE_RATE;
  const totalReserva = subtotalReserva + comisionServicio;
  // Para que el resumen genérico de pago (`${cantidad} ${espacio.unidad}(s)`) diga
  // "entrada(s)" en vez de "hora(s)" cuando corresponde.
  const espacioParaPago = esCupoCompartido ? { ...espacio, unidad: unidadLabel } : espacio;

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
            <ArrowLeftIcon size={20} color={colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Detalle del Espacio</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={handleFavoritePress} style={styles.headerBtn}>
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
                  <LocationIcon size={10} color={colors.textInverse} />
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
                      Si no los completas, la factura se emite a "Consumidor Final".
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
                  onPress={handleReservar}
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
          espacio={espacioParaPago}
          fecha={fechaHoraTexto}
          cantidad={cantidadUnidades}
          total={(reservaCreada?.pago.total ?? totalReserva).toFixed(2)}
          reservaId={reservaCreada?.id ?? null}
          onClose={handleClosePayment}
          onSuccess={handlePaymentSuccess}
        />
      )}
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
    color: t.colors.textInverse,
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
    color: t.colors.textInverse,
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
    color: t.colors.textInverse,
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
    color: t.colors.textInverse,
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
