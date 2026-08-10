import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { makeStyles, useTheme } from '@/theme';
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
  const styles = useStyles();
  const { colors } = useTheme();

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
            color={isFavorite ? colors.favorite : colors.textSecondary}
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
          <LocationIcon size={13} color={colors.textMuted} />
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

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    overflow: 'hidden',
    marginBottom: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    ...t.shadows.md,
  },
  imageContainer: {
    height: 176,
    width: '100%',
    backgroundColor: t.colors.skeleton,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: t.spacing.sm,
    left: t.spacing.sm,
    backgroundColor: t.colors.primaryScrim,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.full,
  },
  categoryBadgeText: {
    color: t.colors.accent,
    fontSize: t.fontSize.xxs - 1,
    fontWeight: t.fontWeight.extraBold,
    letterSpacing: 1.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: t.spacing.sm,
    right: t.spacing.sm,
    backgroundColor: t.colors.overlayLight,
    borderRadius: t.radius.full,
    padding: t.spacing.xs,
  },
  info: {
    padding: t.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: t.spacing.xxs,
  },
  subcategoria: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.accent,
    flex: 1,
    marginRight: t.spacing.xs,
  },
  nombre: {
    ...t.typography.subtitle,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xxs,
    marginBottom: t.spacing.sm,
  },
  ubicacion: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginBottom: t.spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: t.fontSize.xxs - 1,
    color: t.colors.textMuted,
    fontWeight: t.fontWeight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  price: {
    ...t.typography.bodySmStrong,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textPrimary,
  },
  priceUnit: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.regular,
    color: t.colors.textSecondary,
  },
  reserveButton: {
    backgroundColor: t.colors.accentSoft,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.md,
  },
  reserveButtonText: {
    color: t.colors.accent,
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
  },
}));

export default React.memo(SpaceCard);
