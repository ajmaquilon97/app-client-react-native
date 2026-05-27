import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface SettingItemProps {
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
}

function SettingItem({ label, value, onPress, isLast = false }: SettingItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[styles.settingItem, !isLast && styles.settingItemBorder]}>
      <Text style={styles.settingLabel}>{label}</Text>
      {value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : (
        <Text style={styles.settingChevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryDark}
        translucent={false}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <Text style={styles.headerSubtitle}>Preferencias de la aplicación</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>U</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Usuario</Text>
            <Text style={styles.profileEmail}>usuario@espacios.com</Text>
          </View>
        </View>

        <Text style={styles.groupLabel}>GENERAL</Text>
        <View style={styles.settingsGroup}>
          <SettingItem label="Notificaciones" onPress={() => {}} />
          <SettingItem label="Idioma" value="Español" />
          <SettingItem label="Moneda" value="USD" />
          <SettingItem label="Tema" value="Claro" isLast />
        </View>

        <Text style={styles.groupLabel}>CUENTA</Text>
        <View style={styles.settingsGroup}>
          <SettingItem label="Editar perfil" onPress={() => {}} />
          <SettingItem label="Cambiar contraseña" onPress={() => {}} />
          <SettingItem label="Métodos de pago" onPress={() => {}} isLast />
        </View>

        <Text style={styles.groupLabel}>SOPORTE</Text>
        <View style={styles.settingsGroup}>
          <SettingItem label="Centro de ayuda" onPress={() => {}} />
          <SettingItem label="Términos y condiciones" onPress={() => {}} />
          <SettingItem label="Política de privacidad" onPress={() => {}} isLast />
        </View>

        <Text style={styles.groupLabel}>APLICACIÓN</Text>
        <View style={styles.settingsGroup}>
          <SettingItem label="Versión" value="1.0.0" isLast />
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + Spacing.lg }} />
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  profileAvatarText: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
  groupLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  settingsGroup: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLabel: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  settingValue: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
    fontWeight: FontWeight.regular,
  },
  settingChevron: {
    fontSize: FontSize.xl,
    color: Colors.gray300,
    lineHeight: FontSize.xl + 4,
  },
  logoutButton: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  logoutText: {
    color: Colors.error,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
});
