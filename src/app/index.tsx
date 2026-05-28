import SearchBar from '@/components/common/SearchBar';
import CategoryCard from '@/components/home/CategoryCard';
import EmptyState from '@/components/home/EmptyState';
import SpaceCard from '@/components/home/SpaceCard';
import SpaceDetailSheet from '@/components/space/SpaceDetailSheet';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import { useFavoritesContext } from '@/context/FavoritesContext';
import { useFilteredSpaces } from '@/hooks/useFilteredSpaces';
import { Categoria, Espacio } from '@/types';
import { useCallback, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIAS: Categoria[] = ['canchas', 'piscinas', 'salones'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<Categoria | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [espacioDetalle, setEspacioDetalle] = useState<Espacio | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const { espacios, total } = useFilteredSpaces({
    categoria: categoriaSeleccionada,
    query: busqueda,
  });

  const handleCategoryPress = useCallback(
    (categoria: Categoria) => {
      setCategoriaSeleccionada(prev =>
        prev === categoria ? null : categoria,
      );
    },
    [],
  );

  const handleCardPress = useCallback((espacio: Espacio) => {
    setEspacioDetalle(espacio);
    setSheetVisible(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setEspacioDetalle(null);
  }, []);

  const handleReset = useCallback(() => {
    setBusqueda('');
    setCategoriaSeleccionada(null);
  }, []);

  const renderSpaceCard = useCallback(
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

  const ListHeaderComponent = (
    <View style={styles.listHeader}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categorías de Espacio</Text>
        {categoriaSeleccionada && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCategoriaSeleccionada(null)}>
            <Text style={styles.verTodo}>Ver todo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.categoriesRow}>
        {CATEGORIAS.map(cat => (
          <CategoryCard
            key={cat}
            categoria={cat}
            isActive={categoriaSeleccionada === cat}
            onPress={handleCategoryPress}
          />
        ))}
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {categoriaSeleccionada
            ? `${categoriaSeleccionada.charAt(0).toUpperCase() + categoriaSeleccionada.slice(1)}`
            : 'Espacios Destacados'}
        </Text>
        <Text style={styles.resultsCount}>{total} encontrados</Text>
      </View>
    </View>
  );

  const ListEmptyComponent = <EmptyState onReset={handleReset} />;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryDark}
        translucent={false}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hola de nuevo</Text>
            <Text style={styles.headerTitle}>Busca tu Espacio</Text>
          </View>

          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>U</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          
        </View>

        <SearchBar
          value={busqueda}
          onChangeText={setBusqueda}
          onClear={handleReset}
        />
      </View>

      <FlatList
        data={espacios}
        renderItem={renderSpaceCard}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: {
    color: Colors.teal200,
    fontSize: FontSize.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: FontWeight.semiBold,
    marginBottom: 2,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentTeal,
    borderWidth: 2,
    borderColor: Colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  listHeader: {
    paddingTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  verTodo: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.accentTeal,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  resultsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  resultsCount: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: FontWeight.medium,
  },
});
