import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { makeStyles } from '@/theme';

type HintRowProps = {
  title?: string;
  hint?: ReactNode;
};

export function HintRow({ title = 'Try editing', hint = 'app/index.tsx' }: HintRowProps) {
  const styles = useStyles();

  return (
    <View style={styles.stepRow}>
      <ThemedText type="bodySm">{title}</ThemedText>
      <ThemedView type="surfaceAlt" style={styles.codeSnippet}>
        <ThemedText themeColor="textSecondary">{hint}</ThemedText>
      </ThemedView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeSnippet: {
    borderRadius: t.radius.sm,
    paddingVertical: t.spacing.xxs / 2,
    paddingHorizontal: t.spacing.xs,
  },
}));
