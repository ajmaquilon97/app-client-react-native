import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles } from '@/shared/theme';
import { ScreenState } from '@/shared/ui/feedback';

export default function NotFoundScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenState
        variant="empty"
        title="Esta pantalla no existe"
        message="El enlace que abriste no lleva a ninguna parte."
        actionLabel="Ir al inicio"
        onAction={() => router.replace('/')}
      />
    </View>
  );
}

const useStyles = makeStyles(t => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
}));
