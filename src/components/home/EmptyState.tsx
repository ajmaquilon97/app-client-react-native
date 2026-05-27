import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { SadFaceIcon } from '@/components/icons';

interface EmptyStateProps {
  onReset: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onReset }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <SadFaceIcon size={36} color={Colors.gray400} />
      </View>
      <Text style={styles.title}>Sin resultados</Text>
      <Text style={styles.subtitle}>
        No encontramos espacios con ese nombre o categoría. Intenta otra
        búsqueda.
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onReset}
        style={styles.button}>
        <Text style={styles.buttonText}>Restablecer</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

export default React.memo(EmptyState);
