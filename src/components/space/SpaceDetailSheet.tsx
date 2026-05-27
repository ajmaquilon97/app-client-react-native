import React, { useCallback, useRef, useState, useEffect } from 'react';
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
  Animated,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Espacio } from '@/types';
import { ArrowLeftIcon, HeartIcon, CheckIcon, LocationIcon } from '@/components/icons';
import StarRating from '@/components/common/StarRating';

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
  const [fechaReserva, setFechaReserva] = useState('');
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setFechaReserva('');
      setReservaConfirmada(false);
    }
  }, [visible]);

  const handleFavoritePress = useCallback(() => {
    if (espacio) {
      onToggleFavorite(espacio.id);
    }
  }, [espacio, onToggleFavorite]);

  const handleReservar = useCallback(() => {
    if (!fechaReserva.trim()) {
      Alert.alert(
        'Fecha requerida',
        'Por favor ingresa la fecha para tu reserva.',
        [{ text: 'Entendido' }],
      );
      return;
    }

    setReservaConfirmada(true);
    Animated.sequence([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setReservaConfirmada(false);
      setFechaReserva('');
      onClose();
    });
  }, [fechaReserva, successOpacity, onClose]);

  if (!espacio) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          style={[styles.sheet, { paddingBottom: insets.bottom }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          {/* Handle */}
          <View style={styles.handleWrapper}>
            <View style={styles.handleIndicator} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Image Header */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: espacio.imagen }}
                style={styles.image}
                contentFit="cover"
              />

              {/* Close button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                style={styles.closeButton}>
                <ArrowLeftIcon size={20} color={Colors.white} strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Favorite button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleFavoritePress}
                style={styles.favoriteButton}>
                <HeartIcon
                  size={20}
                  color={isFavorite ? Colors.rose : Colors.gray600}
                  filled={isFavorite}
                />
              </TouchableOpacity>
            </View>

            {/* Detail content */}
            <View style={styles.content}>
              {/* Subcategory badge */}
              <View style={styles.subcategoryBadge}>
                <Text style={styles.subcategoryText}>{espacio.subcategoria}</Text>
              </View>

              <Text style={styles.nombre}>{espacio.nombre}</Text>

              {/* Rating and location row */}
              <View style={styles.metaRow}>
                <StarRating
                  rating={espacio.rating}
                  reviews={espacio.reviews}
                  size="md"
                  showCount
                />
                <View style={styles.locationRow}>
                  <LocationIcon size={14} color={Colors.gray400} />
                  <Text style={styles.ubicacion} numberOfLines={1}>
                    {espacio.ubicacion}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Description */}
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.descripcion}>{espacio.descripcion}</Text>

              {/* Services */}
              <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
                ¿Qué ofrece este espacio?
              </Text>
              <View style={styles.servicesGrid}>
                {espacio.servicios.map((servicio, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <CheckIcon size={16} color={Colors.accentTeal} />
                    <Text style={styles.serviceText} numberOfLines={1}>
                      {servicio}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Booking form */}
              <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingTitle}>Seleccionar Fecha</Text>
                  <Text style={styles.bookingPrice}>
                    ${espacio.precio}{' '}
                    <Text style={styles.bookingPriceUnit}>
                      /{espacio.unidad}
                    </Text>
                  </Text>
                </View>

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

                {reservaConfirmada ? (
                  <Animated.View
                    style={[styles.successBanner, { opacity: successOpacity }]}>
                    <Text style={styles.successText}>
                      Reserva Confirmada Exitosamente!
                    </Text>
                  </Animated.View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleReservar}
                    style={styles.reserveButton}>
                    <Text style={styles.reserveButtonText}>
                      SOLICITAR RESERVA
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayDark,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '92%',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  imageContainer: {
    height: 224,
    width: '100%',
    backgroundColor: Colors.gray200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.overlayLight,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.xl,
  },
  subcategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.tealLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  subcategoryText: {
    color: Colors.accentTeal,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  nombre: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    marginBottom: Spacing.sm,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  ubicacion: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
  },
  sectionTitleSpaced: {
    marginTop: Spacing.md,
  },
  descripcion: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
    width: '47%',
  },
  serviceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray700,
    flex: 1,
  },
  bookingCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bookingTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  bookingPrice: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  bookingPriceUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    color: Colors.gray500,
  },
  dateInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  reserveButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  reserveButtonText: {
    color: Colors.accentTeal,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    letterSpacing: 1.2,
  },
  successBanner: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  successText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

export default React.memo(SpaceDetailSheet);
