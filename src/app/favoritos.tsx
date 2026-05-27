import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  Platform,
  ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Espacio } from '@/types';
import { useFavoritesContext } from '@/context/FavoritesContext';
import { useFavoriteSpaces } from '@/hooks/useFilteredSpaces';
import SpaceCard from '@/components/home/SpaceCard';
import SpaceDetailSheet from '@/components/space/SpaceDetailSheet';
import { HeartIcon } from '@/components/icons';

export default function FavoritesScreen() {
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
        <HeartIcon size={32} color={Colors.gray300} />
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
        backgroundColor={Colors.primaryDark}
        translucent={false}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
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
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },
});
