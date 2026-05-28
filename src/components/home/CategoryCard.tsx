import { BuildingIcon2, FootBallIcon, WaterIcon2 } from '@/components/icons';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import { Categoria } from '@/types';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  const meta = CATEGORY_META[categoria];
  const { Icon } = meta;

  const handlePress = useCallback(() => {
    onPress(categoria);
  }, [onPress, categoria]);

  const iconColor = isActive ? Colors.accentTeal : Colors.primaryDark;
  const iconBgColor = isActive ? Colors.tealMedium : Colors.primaryDarkLight;

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

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardActive: {
    backgroundColor: Colors.primaryDark,
    borderWidth: 2,
    borderColor: Colors.accentTeal,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.white,
  },
  sublabel: {
    fontSize: 9,
    fontWeight: FontWeight.medium,
    color: Colors.gray400,
    marginTop: 2,
    textAlign: 'center',
  },
  sublabelActive: {
    color: Colors.teal200,
  },
});

export default React.memo(CategoryCard);
