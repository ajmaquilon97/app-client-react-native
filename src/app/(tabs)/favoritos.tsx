import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StatusBar, Platform, ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Espacio } from '@/types';
import { useFavoritesContext } from '@/context/FavoritesContext';
import { useFavoriteSpaces } from '@/hooks/useFilteredSpaces';
import SpaceCard from '@/components/home/SpaceCard';
import SpaceDetailSheet from '@/components/space/SpaceDetailSheet';
import { HeartIcon } from '@/components/icons';
import { makeStyles, spacing, useTheme } from '@/theme';

export default function FavoritesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { isFavorite, toggleFavorite, favorites } = useFavoritesContext();
  const favoriteSpaces = useFavoriteSpaces(favorites);
  const [espacioDetalle, setEspacioDetalle] = useState<Espacio | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleCardPress = useCallback((espacio: Espacio) => {
    setEspacioDetalle(espacio);
    setSheetVisible(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setEspacioDetalle(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Espacio>) => (
      <SpaceCard
        espacio={item}
        isFavorite={isFavorite(item.id)}
        onPress={handleCardPress}
        onToggleFavorite={toggleFavorite}
      />
    ),
    [isFavorite, handleCardPress, toggleFavorite],
  );

  const keyExtractor = useCallback((item: Espacio) => String(item.id), []);

  const ListEmptyComponent = (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <HeartIcon size={32} color={colors.borderStrong} />
      </View>
      <Text style={styles.emptyTitle}>Sin favoritos aún</Text>
      <Text style={styles.emptySubtitle}>
        Guarda espacios que te interesen tocando el corazón en cada tarjeta.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent={false}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Mis Favoritos</Text>
        <Text style={styles.headerSubtitle}>
          {favorites.length} espacio{favorites.length !== 1 ? 's' : ''}{' '}
          guardado{favorites.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={favoriteSpaces}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <SpaceDetailSheet
        visible={sheetVisible}
        espacio={espacioDetalle}
        isFavorite={espacioDetalle ? isFavorite(espacioDetalle.id) : false}
        onToggleFavorite={toggleFavorite}
        onClose={handleSheetClose}
      />
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
    color: t.colors.textInverse,
    fontSize: t.fontSize.xxl,
    fontWeight: t.fontWeight.bold,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: t.colors.accentMuted,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.medium,
  },
  listContent: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xl,
    paddingBottom: t.spacing.xl,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: t.spacing.xxxl * 2,
    paddingHorizontal: t.spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.md,
  },
  emptyTitle: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: t.fontSize.base,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
}));
