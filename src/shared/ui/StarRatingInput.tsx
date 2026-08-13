import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { StarIcon } from '@/shared/ui/icons';
import { makeStyles, useTheme } from '@/shared/theme';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
}

const STARS = [1, 2, 3, 4, 5];

export default function StarRatingInput({ value, onChange, size = 30, disabled }: StarRatingInputProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {STARS.map(star => (
        <TouchableOpacity
          key={star}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={star === 1 ? '1 estrella' : `${star} estrellas`}
          onPress={() => onChange(star)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <StarIcon size={size} color={colors.star} filled={star <= value} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    gap: t.spacing.xs,
  },
}));
