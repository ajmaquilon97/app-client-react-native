import { version } from 'expo/package.json';
import { Image } from 'expo-image';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { makeStyles, useTheme } from '@/theme';

export function WebBadge() {
  const styles = useStyles();
  const { isDark } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="code" themeColor="textSecondary" style={styles.versionText}>
        v{version}
      </ThemedText>
      <Image
        source={
          isDark
            ? require('@/assets/images/expo-badge-white.png')
            : require('@/assets/images/expo-badge.png')
        }
        style={styles.badgeImage}
      />
    </ThemedView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    padding: t.spacing.xxl,
    alignItems: 'center',
    gap: t.spacing.xs,
  },
  versionText: {
    textAlign: 'center',
  },
  badgeImage: {
    width: 123,
    aspectRatio: 123 / 24,
  },
}));
