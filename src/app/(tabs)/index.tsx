import SearchBar from '@/shared/ui/SearchBar';
import { ScreenState } from '@/shared/ui/feedback';
import { CategoryCard, EmptyState, SpaceCard, useFilteredSpaces, QuickFilters, SearchScreen, Categoria, Espacio, FiltroRapido } from '@/features/espacios';
import SpaceDetailSheet from '@/components/space/SpaceDetailSheet';
import { SaveToListSheet, useEsFavorito, useToggleFavorito } from '@/features/favoritos';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, ListRenderItemInfo, Modal, Platform, Pressable, RefreshControl, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, spacing, useTheme } from '@/shared/theme';

const CATEGORIAS: Categoria[] = ['canchas', 'piscinas', 'salones'];

export default function HomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
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
  const [guardarEnListaId, setGuardarEnListaId] = useState<number | null>(null);

  const isFavorite = useEsFavorito();
  const toggle = useToggleFavorito();
  const toggleFavorite = useCallback(
    (espacioId: number) => toggle.mutate({ espacioId, esFavorito: isFavorite(espacioId) }),
    [toggle, isFavorite],
  );

  const { espacios, total, isLoading, isError, isRefetching, refetch } = useFilteredSpaces({
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
        onLongPressFavorite={setGuardarEnListaId}
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

  // La lista vacía puede significar tres cosas muy distintas. Antes las tres
  // pintaban "Sin resultados", así que durante la carga inicial y ante un error
  // de red el catálogo parecía vacío.
  const ListEmptyComponent = isLoading ? (
    <ScreenState variant="loading" />
  ) : isError ? (
    <ScreenState
      variant="error"
      title="No se pudieron cargar los espacios"
      message="Revisa tu conexión e inténtalo de nuevo."
      onAction={refetch}
    />
  ) : (
    <EmptyState onReset={handleReset} />
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent={false}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
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
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
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

      <SaveToListSheet
        visible={guardarEnListaId != null}
        espacioId={guardarEnListaId}
        onClose={() => setGuardarEnListaId(null)}
      />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuCard, { top: insets.top + spacing.md + 48 }]}>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: t.spacing.lg,
  },
  greeting: {
    color: t.colors.headerTextMuted,
    fontSize: t.fontSize.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: t.fontWeight.semiBold,
    marginBottom: 2,
  },
  headerTitle: {
    color: t.colors.headerText,
    fontSize: t.fontSize.xxl,
    fontWeight: t.fontWeight.bold,
    letterSpacing: -0.5,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.accent,
    borderWidth: 2,
    borderColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: t.colors.onAccent,
    fontSize: t.fontSize.md,
    fontWeight: t.fontWeight.bold,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: t.colors.success,
    borderWidth: 2,
    borderColor: t.colors.primaryText,
  },
  listContent: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  listHeader: {
    paddingTop: t.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: t.spacing.sm,
  },
  sectionTitle: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  verTodo: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.accent,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    marginBottom: t.spacing.xl,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: t.spacing.md,
  },
  resultsTitle: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  resultsCount: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
  },
  menuBackdrop: {
    flex: 1,
  },
  menuCard: {
    position: 'absolute',
    right: t.spacing.lg,
    minWidth: 220,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: t.colors.shadow,
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
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderSubtle,
  },
  menuUserName: {
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  menuUserEmail: {
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  menuItem: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm + 2,
  },
  menuItemText: {
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.error,
  },
}));
