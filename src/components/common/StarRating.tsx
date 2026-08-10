import React from 'react';
import { View, Text } from 'react-native';
import { makeStyles, useTheme } from '@/theme';
import { StarIcon } from '@/components/icons';

interface StarRatingProps {
  rating: number;
  reviews?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  reviews,
  size = 'sm',
  showCount = false,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const iconSize = size === 'sm' ? 12 : 16;
  const textStyle = size === 'sm' ? styles.ratingTextSm : styles.ratingTextMd;

  return (
    <View style={styles.container}>
      <StarIcon size={iconSize} color={colors.star} filled />
      <Text style={[textStyle, styles.ratingValue]}>{rating.toFixed(1)}</Text>
      {showCount && reviews !== undefined && (
        <Text style={[textStyle, styles.reviewCount]}>({reviews} reseñas)</Text>
      )}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xxs,
  },
  ratingValue: {
    color: t.colors.textPrimary,
    fontWeight: t.fontWeight.bold,
  },
  reviewCount: {
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.regular,
  },
  ratingTextSm: {
    fontSize: t.fontSize.xs,
  },
  ratingTextMd: {
    fontSize: t.fontSize.sm,
  },
}));

export default React.memo(StarRating);
