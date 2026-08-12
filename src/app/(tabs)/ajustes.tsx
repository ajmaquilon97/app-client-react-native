import React from 'react';
import { View, Text, StatusBar, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { ThemeMode, useThemeMode } from '@/context/ThemeModeContext';
import { makeStyles, spacing, useTheme } from '@/shared/theme';

const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Oscuro',
};

const NEXT_THEME_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

interface SettingItemProps {
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
}

function SettingItem({ label, value, onPress, isLast = false }: SettingItemProps) {
  const styles = useStyles();
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
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { mode, setMode } = useThemeMode();

  const nombreCompleto = user
    ? [user.nombre, user.apellido].filter(Boolean).join(' ')
    : '';
  const avatarInitial = user?.nombre?.charAt(0).toUpperCase() ?? 'U';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleCycleTheme = () => {
    setMode(NEXT_THEME_MODE[mode]);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent={false}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <Text style={styles.headerSubtitle}>Preferencias de la aplicación</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{avatarInitial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{nombreCompleto}</Text>
            <Text style={styles.profileEmail}>{user?.correo}</Text>
          </View>
        </View>

        <Text style={styles.groupLabel}>GENERAL</Text>
        <View style={styles.settingsGroup}>
          <SettingItem label="Notificaciones" onPress={() => {}} />
          <SettingItem
            label="Tema"
            value={THEME_MODE_LABELS[mode]}
            onPress={handleCycleTheme}
            isLast
          />
        </View>

        <Text style={styles.groupLabel}>CUENTA</Text>
        <View style={styles.settingsGroup}>
          <SettingItem label="Editar perfil" onPress={() => {}} />
          <SettingItem label="Cambiar contraseña" onPress={() => {}} isLast />
        </View>

        <Text style={styles.groupLabel}>SOPORTE</Text>
        <View style={styles.settingsGroup}>
          <SettingItem label="Centro de ayuda" onPress={() => {}} />
          <SettingItem
            label="Términos y condiciones"
            onPress={() => router.push('/terminos-condiciones')}
          />
          <SettingItem
            label="Política de privacidad"
            onPress={() => router.push('/politica-privacidad')}
            isLast
          />
        </View>

        <Text style={styles.groupLabel}>APLICACIÓN</Text>
        <View style={styles.settingsGroup}>
          <SettingItem label="Versión" value="1.0.0" isLast />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.logoutButton}
          onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + spacing.lg }} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
    borderBottomLeftRadius: t.radius.xxl + 4,
    borderBottomRightRadius: t.radius.xxl + 4,
    ...Platform.select({
      ios: {
        shadowColor: t.colors.shadow,
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
    color: t.colors.headerText,
    fontSize: t.fontSize.xxl,
    fontWeight: t.fontWeight.bold,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: t.colors.headerTextMuted,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.medium,
  },
  scrollContent: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xl,
  },
  profileCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: t.spacing.xl,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: t.colors.shadow,
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
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: t.spacing.md,
  },
  profileAvatarText: {
    color: t.colors.onAccent,
    fontSize: t.fontSize.xl,
    fontWeight: t.fontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: t.fontSize.md,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
  },
  groupLabel: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textMuted,
    letterSpacing: 1,
    marginBottom: t.spacing.xs,
    paddingHorizontal: t.spacing.xxs,
  },
  settingsGroup: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    marginBottom: t.spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: t.colors.shadow,
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
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderSubtle,
  },
  settingLabel: {
    fontSize: t.fontSize.base,
    color: t.colors.textPrimary,
    fontWeight: t.fontWeight.medium,
  },
  settingValue: {
    fontSize: t.fontSize.sm,
    color: t.colors.textMuted,
    fontWeight: t.fontWeight.regular,
  },
  settingChevron: {
    fontSize: t.fontSize.xl,
    color: t.colors.borderStrong,
    lineHeight: t.fontSize.xl + 4,
  },
  logoutButton: {
    backgroundColor: t.colors.errorSoft,
    borderRadius: t.radius.xl,
    paddingVertical: t.spacing.md,
    alignItems: 'center',
    marginBottom: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.error + '30',
  },
  logoutText: {
    color: t.colors.error,
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
  },
}));
