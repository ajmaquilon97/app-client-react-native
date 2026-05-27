import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
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
  const iconSize = size === 'sm' ? 12 : 16;
  const textStyle = size === 'sm' ? styles.ratingTextSm : styles.ratingTextMd;

  return (
    <View style={styles.container}>
      <StarIcon size={iconSize} color={Colors.amber} filled />
      <Text style={[textStyle, styles.ratingValue]}>{rating.toFixed(1)}</Text>
      {showCount && reviews !== undefined && (
        <Text style={[textStyle, styles.reviewCount]}>({reviews} reseñas)</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  ratingValue: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  reviewCount: {
    color: Colors.gray500,
    fontWeight: FontWeight.regular,
  },
  ratingTextSm: {
    fontSize: FontSize.xs,
  },
  ratingTextMd: {
    fontSize: FontSize.sm,
  },
});

export default React.memo(StarRating);
