import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Espacio } from '@/types';
import { ArrowLeftIcon, HeartIcon, CheckIcon, LocationIcon } from '@/components/icons';
import PaymentModal from '@/components/payment/PaymentModal';
import { useReservationsContext } from '@/context/ReservationsContext';

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
  const { addReserva } = useReservationsContext();
  const [fechaReserva, setFechaReserva] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFechaReserva('');
      setCantidad(1);
      setShowPayment(false);
    }
  }, [visible]);

  const handleFavoritePress = useCallback(() => {
    if (espacio) onToggleFavorite(espacio.id);
  }, [espacio, onToggleFavorite]);

  const handleReservar = useCallback(() => {
    if (!fechaReserva.trim()) {
      Alert.alert('Fecha requerida', 'Por favor ingresa la fecha para tu reserva.', [{ text: 'Entendido' }]);
      return;
    }
    setShowPayment(true);
  }, [fechaReserva]);

  const handlePaymentSuccess = useCallback(
    (result: { transactionId: string; amount: string }) => {
      if (espacio) {
        const totalReserva = espacio.precio * cantidad * 1.1;
        addReserva({
          espacio,
          fecha: fechaReserva,
          cantidad,
          total: totalReserva,
          codigo: result.transactionId,
        });
      }
      setShowPayment(false);
      setFechaReserva('');
      setCantidad(1);
      onClose();
      router.navigate('/calendario');
    },
    [espacio, cantidad, fechaReserva, addReserva, onClose, router],
  );

  if (!espacio) return null;

  const subtotal = espacio.precio * cantidad;
  const tarifaServicio = subtotal * 0.1;
  const total = subtotal + tarifaServicio;

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
                <Text style={styles.distancia}>📍 a {espacio.distancia} km</Text>
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

              {/* Mapa placeholder */}
              <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Ubicación aproximada</Text>
              <View style={styles.mapContainer}>
                <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <Path d="M0 20 L100 10 M0 50 L100 70 M30 0 L50 100 M70 0 L80 100" stroke="#CBD5E1" strokeWidth="2" fill="none" />
                  <Rect x="15" y="15" width="20" height="20" fill="#E2E8F0" rx="3" />
                  <Rect x="55" y="45" width="25" height="15" fill="#E2E8F0" rx="3" />
                  <Circle cx="50" cy="50" r="10" fill="#14B8A6" fillOpacity="0.15" />
                  <Circle cx="50" cy="50" r="3" fill="#14B8A6" />
                </Svg>
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

                <Text style={styles.inputLabel}>Fecha del Evento</Text>
                <TextInput
                  value={fechaReserva}
                  onChangeText={setFechaReserva}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={Colors.gray400}
                  style={styles.dateInput}
                  keyboardType="numeric"
                  maxLength={10}
                  returnKeyType="done"
                  selectionColor={Colors.accentTeal}
                />

                <Text style={styles.inputLabel}>Cantidad de {espacio.unidad}s</Text>
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.quantityBtn}
                    onPress={() => setCantidad(prev => Math.max(1, prev - 1))}>
                    <Text style={styles.quantityBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{cantidad}</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.quantityBtn}
                    onPress={() => setCantidad(prev => prev + 1)}>
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Desglose de costos */}
                <View style={styles.costBreakdown}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Costo por {cantidad} {espacio.unidad}{cantidad > 1 ? 's' : ''}:</Text>
                    <Text style={styles.costValue}>${subtotal}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabelSub}>Tarifa de servicio (10%):</Text>
                    <Text style={styles.costValueSub}>${tarifaServicio.toFixed(2)}</Text>
                  </View>
                  <View style={styles.costDivider} />
                  <View style={styles.costRow}>
                    <Text style={styles.costTotal}>Total estimado:</Text>
                    <Text style={styles.costTotalValue}>${total.toFixed(2)}</Text>
                  </View>
                </View>

                <TouchableOpacity activeOpacity={0.85} onPress={handleReservar} style={styles.reserveButton}>
                  <Text style={styles.reserveButtonText}>CONTINUAR AL PAGO →</Text>
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
          fecha={fechaReserva}
          cantidad={cantidad}
          total={total.toFixed(2)}
          onClose={() => setShowPayment(false)}
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
  dateInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semiBold,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  quantityBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    lineHeight: 22,
  },
  quantityValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  costBreakdown: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
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
  costLabelSub: {
    fontSize: 9,
    color: Colors.gray400,
  },
  costValueSub: {
    fontSize: 9,
    color: Colors.gray400,
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
  reserveButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
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
