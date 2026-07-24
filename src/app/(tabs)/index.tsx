import SearchBar from '@/components/common/SearchBar';
import CategoryCard from '@/components/home/CategoryCard';
import EmptyState from '@/components/home/EmptyState';
import SpaceCard from '@/components/home/SpaceCard';
import SpaceDetailSheet from '@/components/space/SpaceDetailSheet';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useFavoritesContext } from '@/context/FavoritesContext';
import { useFilteredSpaces } from '@/hooks/useFilteredSpaces';
import QuickFilters from '@/components/home/QuickFilters';
import SearchScreen from '@/components/home/SearchScreen';
import { Categoria, Espacio, FiltroRapido } from '@/types';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
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
  const router = useRouter();
  const { user, logout } = useAuth();

  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<Categoria | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [espacioDetalle, setEspacioDetalle] = useState<Espacio | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido | null>(null);
  const [pantallaBusqueda, setPantallaBusqueda] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const { espacios, total } = useFilteredSpaces({
    categoria: categoriaSeleccionada,
    query: busqueda,
    filtroRapido,
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

  const handleLogout = useCallback(async () => {
    setMenuVisible(false);
    await logout();
    router.replace('/login');
  }, [logout, router]);

  const handleReset = useCallback(() => {
    setBusqueda('');
    setCategoriaSeleccionada(null);
    setFiltroRapido(null);
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

      <QuickFilters active={filtroRapido} onSelect={setFiltroRapido} />

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

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.avatarContainer}
            onPress={() => setMenuVisible(true)}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setPantallaBusqueda(true)}>
          <SearchBar
            value={busqueda}
            onChangeText={setBusqueda}
            onClear={handleReset}
            editable={false}
            pointerEvents="none"
          />
        </TouchableOpacity>
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

      <SearchScreen
        visible={pantallaBusqueda}
        busqueda={busqueda}
        onChangeText={setBusqueda}
        onClose={() => setPantallaBusqueda(false)}
        onSelectEspacio={handleCardPress}
      />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuCard, { top: insets.top + Spacing.md + 48 }]}>
            <View style={styles.menuUserRow}>
              <Text style={styles.menuUserName} numberOfLines={1}>
                {user ? [user.nombre, user.apellido].filter(Boolean).join(' ') : ''}
              </Text>
              <Text style={styles.menuUserEmail} numberOfLines={1}>
                {user?.correo}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.menuItem}
              onPress={handleLogout}>
              <Text style={styles.menuItemText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  menuBackdrop: {
    flex: 1,
  },
  menuCard: {
    position: 'absolute',
    right: Spacing.lg,
    minWidth: 220,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  menuUserRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuUserName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  menuUserEmail: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  menuItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  menuItemText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    color: Colors.error,
  },
});
