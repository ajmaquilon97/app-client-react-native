import React from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { CalendarIcon } from '@/components/icons';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryDark}
        translucent={false}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Calendario</Text>
        <Text style={styles.headerSubtitle}>Tus reservas y disponibilidad</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <CalendarIcon size={44} color={Colors.gray300} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>Próximamente</Text>
        <Text style={styles.subtitle}>
          Aquí podrás ver todas tus reservas programadas, gestionar fechas y
          revisar la disponibilidad de los espacios en tiempo real.
        </Text>

        <View style={styles.featureList}>
          {[
            'Ver reservas activas',
            'Historial de reservas',
            'Disponibilidad en tiempo real',
            'Notificaciones de recordatorio',
          ].map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xxl + 4,
    borderBottomRightRadius: BorderRadius.xxl + 4,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: Colors.teal200,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  featureList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accentTeal,
  },
  featureText: {
    fontSize: FontSize.base,
    color: Colors.gray700,
    fontWeight: FontWeight.medium,
  },
});
