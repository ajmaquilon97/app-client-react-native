import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { makeStyles, useTheme } from '@/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>        
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Explore</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const styles = useStyles();

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'surfaceAlt' : 'surfaceMuted'}
        style={styles.tabButtonView}>
        <ThemedText type="bodySm" themeColor={isFocused ? 'textPrimary' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="surfaceMuted" style={styles.innerContainer}>
        <ThemedText type="bodySmStrong" style={styles.brandText}>
          Expo Starter
        </ThemedText>

        {props.children}

        <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable style={styles.externalPressable}>
            <ThemedText type="link">Docs</ThemedText>
            <SymbolView
              tintColor={colors.textPrimary}
              name={{ ios: 'arrow.up.right.square', web: 'link' }}
              size={12}
            />
          </Pressable>
        </ExternalLink>
      </ThemedView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: t.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.xxl,
    borderRadius: t.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: t.spacing.xs,
    maxWidth: t.layout.maxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: t.spacing.xxs,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.lg,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: t.spacing.xxs,
    marginLeft: t.spacing.md,
  },
}));
