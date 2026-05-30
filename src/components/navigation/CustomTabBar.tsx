import { CalendarIcon, HeartIcon, HomeIcon, ReservationsIcon, SettingsIcon } from '@/components/icons';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

function ReservationsTabIcon({ color }: TabBarIconProps) {
  return <ReservationsIcon size={22} color={color} />;
}

const ICONS: Record<string, React.FC<TabBarIconProps>> = {
  index: HomeTabIcon,
  calendario: CalendarTabIcon,
  nueva: ReservationsTabIcon,
  favoritos: HeartTabIcon,
  ajustes: SettingsTabIcon,
};

const LABELS: Record<string, string> = {
  index: 'Inicio',
  calendario: 'Calendario',
  //nueva: 'Reservas',
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
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, Spacing.xs);

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
        const iconColor = isFocused ? Colors.primaryDark : Colors.gray400;

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

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray400,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
});
