import { CalendarIcon, HeartIcon, HomeIcon, SettingsIcon } from '@/shared/ui/icons';
import { makeStyles, spacing, useTheme } from '@/shared/theme';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabBarIconProps {
  color: string;
  focused: boolean;
}

function HomeTabIcon({ color }: TabBarIconProps) {
  return <HomeIcon size={22} color={color} />;
}

function CalendarTabIcon({ color }: TabBarIconProps) {
  return <CalendarIcon size={22} color={color} />;
}

function HeartTabIcon({ color, focused }: TabBarIconProps) {
  return <HeartIcon size={22} color={color} filled={focused} />;
}

function SettingsTabIcon({ color }: TabBarIconProps) {
  return <SettingsIcon size={22} color={color} />;
}

const ICONS: Record<string, React.FC<TabBarIconProps>> = {
  index: HomeTabIcon,
  calendario: CalendarTabIcon,
  favoritos: HeartTabIcon,
  ajustes: SettingsTabIcon,
};

const LABELS: Record<string, string> = {
  index: 'Inicio',
  calendario: 'Calendario',
  favoritos: 'Favoritos',
  ajustes: 'Ajustes',
};

interface CustomTabBarProps {
  state: {
    index: number;
    routes: Array<{ name: string; key: string }>;
  };
  descriptors: Record<string, { options: Record<string, unknown> }>;
  navigation: { emit: Function; navigate: Function };
}

export default function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, spacing.xs);

  return (
    <View style={[styles.tabBar, { paddingBottom }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const IconComponent = ICONS[route.name];
        const iconColor = isFocused ? colors.tabBarActive : colors.tabBarInactive;

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            onPress={onPress}
            style={styles.tabItem}>
            {IconComponent && (
              <IconComponent color={iconColor} focused={isFocused} />
            )}
            <Text
              style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
              numberOfLines={1}>
              {LABELS[route.name] ?? route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: t.colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    paddingTop: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
    alignItems: 'center',
    ...t.shadows.lg,
    // La sombra de la tab bar se proyecta hacia arriba.
    shadowOffset: { width: 0, height: -2 },
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xxs,
  },
  tabLabel: {
    ...t.typography.tiny,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.tabBarInactive,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: t.colors.tabBarActive,
    fontWeight: t.fontWeight.bold,
  },
}));
