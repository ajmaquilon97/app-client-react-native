import { BuildingIcon2, FootBallIcon, WaterIcon2 } from '@/shared/ui/icons';
import { makeStyles, useTheme } from '@/shared/theme';
import { Categoria } from '@/types';
import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface CategoryCardProps {
  categoria: Categoria;
  isActive: boolean;
  onPress: (categoria: Categoria) => void;
}

const CATEGORY_META: Record<
  Categoria,
  { label: string; sublabel: string; Icon: React.FC<{ size: number; color: string }> }
> = {
  canchas: {
    label: 'Canchas',
    sublabel: 'Deportivas',
    Icon: FootBallIcon,
  },
  piscinas: {
    label: 'Piscinas',
    sublabel: 'Recreativas',
    Icon: WaterIcon2,
  },
  salones: {
    label: 'Salones',
    sublabel: 'De Eventos',
    Icon: BuildingIcon2,
  },
};

const CategoryCard: React.FC<CategoryCardProps> = ({
  categoria,
  isActive,
  onPress,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const meta = CATEGORY_META[categoria];
  const { Icon } = meta;

  const handlePress = useCallback(() => {
    onPress(categoria);
  }, [onPress, categoria]);

  const iconColor = isActive ? colors.accent : colors.primaryText;
  const iconBgColor = isActive ? colors.accentSoftStrong : colors.primarySoft;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[styles.card, isActive && styles.cardActive]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Icon size={22} color={iconColor} />
      </View>
      <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
        {meta.label}
      </Text>
      <Text style={[styles.sublabel, isActive && styles.sublabelActive]} numberOfLines={1}>
        {meta.sublabel}
      </Text>
    </TouchableOpacity>
  );
};

const useStyles = makeStyles((t) => ({
  card: {
    flex: 1,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadows.sm,
  },
  cardActive: {
    backgroundColor: t.colors.primary,
    borderWidth: 2,
    borderColor: t.colors.accent,
    ...t.shadows.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: t.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.xs,
  },
  label: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textPrimary,
    textAlign: 'center',
  },
  labelActive: {
    color: t.colors.onPrimary,
  },
  sublabel: {
    fontSize: t.fontSize.xxs - 1,
    fontWeight: t.fontWeight.medium,
    color: t.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  sublabelActive: {
    color: t.colors.accentMuted,
  },
}));

export default React.memo(CategoryCard);
