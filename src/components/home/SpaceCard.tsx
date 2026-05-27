import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Espacio } from '@/types';
import { HeartIcon, LocationIcon } from '@/components/icons';
import StarRating from '@/components/common/StarRating';

interface SpaceCardProps {
  espacio: Espacio;
  isFavorite: boolean;
  onPress: (espacio: Espacio) => void;
  onToggleFavorite: (id: number) => void;
}

const SpaceCard: React.FC<SpaceCardProps> = ({
  espacio,
  isFavorite,
  onPress,
  onToggleFavorite,
}) => {
  const handlePress = useCallback(() => {
    onPress(espacio);
  }, [onPress, espacio]);

  const handleFavoritePress = useCallback(() => {
    onToggleFavorite(espacio.id);
  }, [onToggleFavorite, espacio.id]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={styles.card}>
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: espacio.imagen }}
          style={styles.image}
          contentFit="cover"
        />

        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {espacio.categoria.toUpperCase()}
          </Text>
        </View>

        {/* Favorite button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFavoritePress}
          style={styles.favoriteButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <HeartIcon
            size={16}
            color={isFavorite ? Colors.rose : Colors.gray600}
            filled={isFavorite}
          />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.subcategoria} numberOfLines={1}>
            {espacio.subcategoria}
          </Text>
          <StarRating rating={espacio.rating} />
        </View>

        <Text style={styles.nombre} numberOfLines={1}>
          {espacio.nombre}
        </Text>

        <View style={styles.locationRow}>
          <LocationIcon size={13} color={Colors.gray400} />
          <Text style={styles.ubicacion} numberOfLines={1}>
            {espacio.ubicacion}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.priceLabel}>Precio estimado</Text>
            <Text style={styles.price}>
              ${espacio.precio}{' '}
              <Text style={styles.priceUnit}>/ {espacio.unidad}</Text>
            </Text>
          </View>
          <View style={styles.reserveButton}>
            <Text style={styles.reserveButtonText}>Reservar</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageContainer: {
    height: 176,
    width: '100%',
    backgroundColor: Colors.gray200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primaryDarkMedium,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    color: Colors.accentTeal,
    fontSize: 9,
    fontWeight: FontWeight.extraBold,
    letterSpacing: 1.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.overlayLight,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  info: {
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subcategoria: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.accentTeal,
    flex: 1,
    marginRight: Spacing.xs,
  },
  nombre: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  ubicacion: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 9,
    color: Colors.gray400,
    fontWeight: FontWeight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  price: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  priceUnit: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    color: Colors.gray500,
  },
  reserveButton: {
    backgroundColor: Colors.tealLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  reserveButtonText: {
    color: Colors.accentTeal,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});

export default React.memo(SpaceCard);
