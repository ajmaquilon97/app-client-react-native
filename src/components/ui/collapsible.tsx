import { SymbolView } from 'expo-symbols';
import { PropsWithChildren, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { makeStyles, useTheme } from '@/theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemedView>
      <Pressable
        style={({ pressed }) => [styles.heading, pressed && styles.pressedHeading]}
        onPress={() => setIsOpen((value) => !value)}>
        <ThemedView type="surfaceMuted" style={styles.button}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            tintColor={colors.textPrimary}
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          />
        </ThemedView>

        <ThemedText type="bodySm">{title}</ThemedText>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedView type="surfaceMuted" style={styles.content}>
            {children}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const useStyles = makeStyles((t) => ({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
  },
  pressedHeading: {
    opacity: 0.7,
  },
  button: {
    width: t.spacing.xl,
    height: t.spacing.xl,
    borderRadius: t.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: t.spacing.md,
    borderRadius: t.radius.md,
    marginLeft: t.spacing.xl,
    padding: t.spacing.xl,
  },
}));
